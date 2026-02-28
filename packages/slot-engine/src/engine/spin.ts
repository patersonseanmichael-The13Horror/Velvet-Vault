import type { AuditRecord, MachineConfig, RNG, SpinOutcome, SpinRequest, SpinResult } from "../types.js";
import { createSeededRNG, createSecureRNG } from "../rng/index.js";
import { sampleGrid } from "../model/reelModel.js";
import { evalPaylines } from "../evaluators/paylines.js";
import { evalScatter } from "../evaluators/scatters.js";
import { fnv1a32, stableStringify } from "../util/hash.js";
import { deepFreeze } from "../util/deepFreeze.js";
import { MachineConfigSchema } from "../config/schema.js";
import { ConfigError, SpinError } from "../errors.js";

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

export function spin(request: SpinRequest): SpinResult {
  const machine = validateConfig(request.machine);

  const stake = request.bet?.stake;
  if (!Number.isInteger(stake) || stake <= 0) throw new SpinError("bet.stake must be a positive integer");

  const secure = createSecureRNG();
  const seedUsed = request.seed ?? generateSeedFallback(secure);
  const rng = request.seed ? createSeededRNG(seedUsed) : secure;

  const configHash = fnv1a32(stableStringify(machine));

  const grid = sampleGrid(machine, rng);

  if (machine.mode !== "paylines") throw new SpinError(`Unsupported mode: ${machine.mode}`);

  const lineWins = evalPaylines(grid, machine, stake);
  const scatterWin = evalScatter(grid, machine, stake);

  let total = 0;
  for (const w of lineWins) total += w.payout;
  if (scatterWin) total += scatterWin.payout;

  const originalTotal = total;

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

  const outcome: SpinOutcome = {
    grid,
    lineWins,
    scatterWin,
    totalPayout: total,
    totalPayoutMultiplier: total / stake,
    ...(capped ? { capped } : {})
  };

  const audit: AuditRecord = {
    machineId: machine.id,
    machineVersion: machine.version,
    configHash,
    seedUsed,
    bet: request.bet,
    requestId: request.requestId,
    timestampMs: nowMs()
  };

  return { audit, outcome };
}
