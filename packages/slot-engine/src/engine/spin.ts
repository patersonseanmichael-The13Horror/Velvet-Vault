import type {
  AuditRecord,
  BonusBuyRequest,
  FeatureEvents,
  MachineConfig,
  RNG,
  SpinOutcome,
  SpinRequest,
  SpinResult
} from "../types.js";
import { createSeededRNG, createSecureRNG, createProvablyFairRNG, createServerSeed } from "../rng/index.js";
import { sampleGrid } from "../model/reelModel.js";
import { evalClusters } from "../evaluators/clusters.js";
import { evalPaylines } from "../evaluators/paylines.js";
import { evalWays } from "../evaluators/ways.js";
import { evalScatter } from "../evaluators/scatters.js";
import { factoryProfileHash, resolveFactoryProfile } from "../factory/symbolFactory.js";
import { fnv1a32, stableStringify } from "../util/hash.js";
import { deepFreeze } from "../util/deepFreeze.js";
import { MachineConfigSchema } from "../config/schema.js";
import { ConfigError, SpinError } from "../errors.js";
import {
  applyFreeSpinStateTransition,
  computeFreeSpinWinMultiplier,
  initialFeatureState,
  isInFreeSpins
} from "../features/freeSpins.js";
import { countBonusSymbols, runHoldAndSpinBonus } from "../features/bonusHoldAndSpin.js";
import { runAvalanche } from "./avalanche.js";
import { runCascadePaylines } from "./cascade.js";
import { runClusterCascade } from "./clusterCascade.js";

function nowMs(): number {
  return Date.now();
}

function generateSeedFallback(rng: RNG): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "vd_";
  for (let i = 0; i < 24; i++) s += alphabet[rng.nextInt(alphabet.length)];
  return s;
}

export function validateConfig(machine: MachineConfig): MachineConfig {
  const parsed = MachineConfigSchema.safeParse(machine);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  return deepFreeze(parsed.data as MachineConfig);
}

function validateModeRequirements(machine: MachineConfig): void {
  if (machine.mode === "paylines" || machine.mode === "cascade" || machine.mode === "avalanche") {
    if (!machine.paylines?.lines?.length) throw new ConfigError(`mode=${machine.mode} requires config.paylines.lines`);
  }
  if (machine.mode === "ways") {
    if (!machine.ways) throw new ConfigError("mode=ways requires config.ways");
  }
  if (machine.mode === "cluster" || machine.mode === "cluster_cascade") {
    if (!machine.features?.cluster && !machine.cluster) {
      throw new ConfigError(`mode=${machine.mode} requires config.features.cluster or config.cluster`);
    }
  }
}

function resolveBonusBuy(args: {
  machine: MachineConfig;
  betStake: number;
  bonusBuy?: BonusBuyRequest;
}): { awardFreeSpins: number; awardBonus: boolean; bonusBuyCost?: number; events?: FeatureEvents } {
  if (!args.bonusBuy) return { awardFreeSpins: 0, awardBonus: false };
  const enabled = args.machine.features?.bonusBuy?.enabled ?? false;
  if (!enabled) return { awardFreeSpins: 0, awardBonus: false };

  if (args.bonusBuy.type === "freespins") {
    const triggers = args.machine.scatter?.triggers ?? [];
    let best = 0;
    for (const t of triggers) if (t.type === "freespins") best = Math.max(best, t.value);
    if (best <= 0) return { awardFreeSpins: 0, awardBonus: false };

    const cfgMult = args.machine.features?.bonusBuy?.freeSpinsCostMultiplier ?? 50;
    const mult = Math.max(1, args.bonusBuy.costMultiplier ?? cfgMult);
    const cost = Math.floor(args.betStake * mult);

    return {
      awardFreeSpins: best,
      awardBonus: false,
      bonusBuyCost: cost,
      events: { bonusBuyActivated: { type: "freespins", awarded: best, cost } }
    };
  }

  if (args.bonusBuy.type === "bonus") {
    const cfgMult = args.machine.features?.bonusBuy?.bonusCostMultiplier ?? 80;
    const mult = Math.max(1, args.bonusBuy.costMultiplier ?? cfgMult);
    const cost = Math.floor(args.betStake * mult);

    return {
      awardFreeSpins: 0,
      awardBonus: true,
      bonusBuyCost: cost,
      events: { bonusBuyActivated: { type: "bonus", awarded: 1, cost } }
    };
  }

  return { awardFreeSpins: 0, awardBonus: false };
}

export function spin(request: SpinRequest): SpinResult {
  const machine = validateConfig(request.machine);
  validateModeRequirements(machine);

  const stake = request.bet?.stake;
  if (!Number.isInteger(stake) || stake <= 0) throw new SpinError("bet.stake must be a positive integer");

  // RNG selection priority:
  // 1) provablyFair (preferred)
  // 2) seed (legacy deterministic)
  // 3) secure RNG
  let rng: RNG;
  let seedUsed: string;
  let pfAudit: AuditRecord["provablyFair"] | undefined;

  const pfEnabled = machine.features?.provablyFair?.enabled ?? true;

  if (pfEnabled && request.provablyFair?.clientSeed != null && request.provablyFair?.nonce != null) {
    const serverSeed = request.provablyFair.serverSeed ?? createServerSeed();
    const pf = createProvablyFairRNG({
      serverSeed,
      clientSeed: request.provablyFair.clientSeed,
      nonce: request.provablyFair.nonce
    });
    rng = pf;
    seedUsed = `pf:${pf.serverSeedHash}:${request.provablyFair.clientSeed}:${request.provablyFair.nonce}`;
    pfAudit = {
      enabled: true,
      clientSeed: request.provablyFair.clientSeed,
      nonce: request.provablyFair.nonce,
      serverSeedHash: pf.serverSeedHash,
      // reveal only if supplied (e.g. replay / verification endpoint)
      ...(request.provablyFair.serverSeed ? { serverSeedReveal: request.provablyFair.serverSeed } : {})
    };
  } else if (request.seed) {
    rng = createSeededRNG(request.seed);
    seedUsed = request.seed;
    pfAudit = { enabled: false };
  } else {
    const secure = createSecureRNG();
    rng = secure;
    seedUsed = generateSeedFallback(secure);
    pfAudit = { enabled: false };
  }

  const configHash = fnv1a32(stableStringify(machine));

  const stateIn = request.state ?? initialFeatureState(machine);
  const isFreeSpin = isInFreeSpins(stateIn);

  // Bonus-buy only if not already in FS
  const buy = !isFreeSpin
    ? resolveBonusBuy({ machine, betStake: stake, ...(request.bonusBuy ? { bonusBuy: request.bonusBuy } : {}) })
    : { awardFreeSpins: 0, awardBonus: false };

  const initialGrid = sampleGrid(machine, rng);

  // BONUS trigger check (from base grid)
  const bonusCfg = machine.features?.bonus?.holdAndSpin;
  const bonusSymbol = bonusCfg?.bonusSymbol ?? "B";
  const triggerCount = bonusCfg?.triggerCount ?? 6;
  const bonusTriggeredBySymbols = bonusCfg?.enabled ? countBonusSymbols(initialGrid, bonusSymbol) >= triggerCount : false;
  const bonusTriggered = buy.awardBonus || bonusTriggeredBySymbols;

  // scatter always computed for state transitions & payout
  const scatterWin = evalScatter(initialGrid, machine, stake);

  // evaluate base/cascade
  let lineWins: SpinOutcome["lineWins"];
  let waysWins: SpinOutcome["waysWins"];
  let clusterWins: SpinOutcome["clusterWins"];
  let cascades: SpinOutcome["cascades"];
  let clusterCascades: SpinOutcome["clusterCascades"];
  let specialEffects: SpinOutcome["specialEffects"];
  let base = 0;
  let cascadeTotal = 0;
  let clusterTotal = 0;
  let specialsTotal = 0;

  if (machine.mode === "paylines") {
    lineWins = evalPaylines(initialGrid, machine, stake);
    base += (lineWins ?? []).reduce((s, w) => s + w.payout, 0);
    base += scatterWin ? scatterWin.payout : 0;
  } else if (machine.mode === "ways") {
    waysWins = evalWays(initialGrid, machine, stake);
    base += (waysWins ?? []).reduce((s, w) => s + w.payout, 0);
    base += scatterWin ? scatterWin.payout : 0;
  } else if (machine.mode === "cascade") {
    const cas = runCascadePaylines({ machine, rng, stake, initialGrid });
    cascades = cas.steps;
    cascadeTotal = cas.totalPayout;
    base += cascadeTotal; // cascade total already includes step multipliers
  } else if (machine.mode === "avalanche") {
    const ava = runAvalanche({ machine, rng, stake, initialGrid });
    cascades = ava.steps;
    cascadeTotal = ava.totalPayout;
    base += cascadeTotal;
  } else if (machine.mode === "cluster") {
    clusterWins = evalClusters(initialGrid, machine, stake);
    clusterTotal = clusterWins.reduce((s, w) => s + w.payout, 0);
    base += clusterTotal;
    base += scatterWin ? scatterWin.payout : 0;
  } else if (machine.mode === "cluster_cascade") {
    const cc = runClusterCascade({ machine, rng, stake, initialGrid });
    clusterCascades = cc.steps;
    clusterTotal = cc.totalPayout;
    specialEffects = cc.steps.flatMap((step) => step.effects ?? []);
    specialsTotal = specialEffects.reduce((sum, effect) => {
      if (effect.type === "transform") return sum + Math.max(1, effect.transformed.length);
      return sum + Math.max(1, effect.removed.length);
    }, 0);
    base += clusterTotal;
    base += scatterWin ? scatterWin.payout : 0;
  }

  // feature transition: free spins (consume + award from scatter + bonus buy)
  const transition = applyFreeSpinStateTransition({
    machine,
    prev: stateIn,
    ...(scatterWin ? { scatterWin } : {}),
    ...(buy.awardFreeSpins > 0 ? { bonusBuyAward: buy.awardFreeSpins } : {})
  });
  const stateOut = transition.next;
  const fsEvents = transition.events;

  // apply FS multiplier only if THIS spin is a free spin
  const winMult = isFreeSpin ? computeFreeSpinWinMultiplier({ machine, consumed: stateIn.freeSpinsConsumed ?? 0 }) : 1;

  // BONUS round payout (independent of FS multiplier in this v3; you can change later)
  let bonusPayout = 0;
  let bonusBlock: SpinOutcome["bonus"] | undefined;
  let bonusEvents: FeatureEvents | undefined;

  if (bonusTriggered && bonusCfg?.enabled) {
    const run = runHoldAndSpinBonus({ machine, rng, stake });
    bonusPayout = run.payout;
    bonusBlock = { type: "holdAndSpin", steps: run.steps, payout: run.payout };
    bonusEvents = {
      enteredBonus: { type: "holdAndSpin", respins: bonusCfg.respins ?? 3 },
      bonusEnded: { payout: run.payout }
    };
  }

  const baseBeforeMult = base + bonusPayout;

  // win multiplier applies to base game payout only (not bonus) in this v3
  const totalBeforeCaps = Math.floor(base * winMult) + bonusPayout;
  let total = totalBeforeCaps;
  const originalTotal = total;

  // caps
  let capped: SpinOutcome["capped"] | undefined;
  const maxWinMult = machine.limits?.maxWinMultiplier;
  if (maxWinMult && total > stake * maxWinMult) {
    total = stake * maxWinMult;
    capped = { reason: "maxWinMultiplier", originalPayout: originalTotal };
  }
  const maxPayout = machine.limits?.maxPayout;
  if (maxPayout && total > maxPayout) {
    total = maxPayout;
    capped = { reason: "maxPayout", originalPayout: originalTotal };
  }

  const cost = {
    stakeCharged: !isFreeSpin,
    stakeToCharge: !isFreeSpin ? stake : 0,
    ...(buy.bonusBuyCost ? { bonusBuyCost: buy.bonusBuyCost } : {})
  };

  const featureEvents: FeatureEvents = {
    ...(fsEvents ?? {}),
    ...(buy.events ?? {}),
    ...(bonusEvents ?? {})
  };
  const hasEvents = Object.keys(featureEvents).length > 0;

  // breakdown
  const breakdown = {
    base:
      machine.mode === "cascade" || machine.mode === "cluster_cascade" || machine.mode === "avalanche"
        ? 0
        : (lineWins ?? []).reduce((s, w) => s + w.payout, 0)
          + (waysWins ?? []).reduce((s, w) => s + w.payout, 0),
    scatters: scatterWin ? scatterWin.payout : 0,
    freeSpinBonus: Math.max(0, Math.floor(base * winMult) - base),
    bonus: bonusPayout,
    cascades: machine.mode === "cascade" || machine.mode === "avalanche" ? cascadeTotal : 0,
    clusters: machine.mode === "cluster" ? clusterTotal
      : machine.mode === "cluster_cascade" ? clusterTotal
      : 0,
    specials: specialsTotal
  };

  const outcome: SpinOutcome = {
    grid: initialGrid,
    ...(lineWins ? { lineWins } : {}),
    ...(waysWins ? { waysWins } : {}),
    ...(clusterWins ? { clusterWins } : {}),
    ...(scatterWin ? { scatterWin } : {}),
    ...(cascades ? { cascades } : {}),
    ...(clusterCascades ? { clusterCascades } : {}),
    ...(specialEffects ? { specialEffects } : {}),
    ...(bonusBlock ? { bonus: bonusBlock } : {}),
    basePayout: baseBeforeMult,
    winMultiplierApplied: winMult,
    totalPayout: total,
    totalPayoutMultiplier: total / stake,
    isFreeSpin,
    cost,
    ...(hasEvents ? { featureEvents } : {}),
    breakdown,
    ...(capped ? { capped } : {})
  };

  const usedProfiles = new Set<string>();
  usedProfiles.add(resolveFactoryProfile(machine, "base") ? "base" : "reelSet");
  usedProfiles.add(resolveFactoryProfile(machine, "refill") ? "refill" : "reelSet");

  const profileHashes: Record<string, string> = {};
  for (const name of ["base", "refill", "bonus", "freeSpins"] as const) {
    const p = resolveFactoryProfile(machine, name);
    if (p) profileHashes[name] = factoryProfileHash(p);
  }

  const audit: AuditRecord = {
    machineId: machine.id,
    machineVersion: machine.version,
    configHash,
    seedUsed,
    bet: request.bet,
    timestampMs: nowMs(),
    stateIn,
    stateOut,
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.bonusBuy ? { bonusBuyIn: request.bonusBuy } : {}),
    factory: {
      usedProfiles: Array.from(usedProfiles),
      profileHashes
    },
    ...(pfAudit ? { provablyFair: pfAudit } : {})
  };

  return { audit, outcome, nextState: stateOut };
}
