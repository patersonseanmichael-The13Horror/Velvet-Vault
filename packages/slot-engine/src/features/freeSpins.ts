import type {
  FeatureEvents,
  FeatureState,
  FreeSpinsMultiplierProgression,
  MachineConfig,
  ScatterWin
} from "../types.js";
import { initialBonusState } from "./bonusHoldAndSpin.js";

export function initialFeatureState(machine: MachineConfig): FeatureState {
  const bonus = initialBonusState(machine);
  return {
    freeSpinsRemaining: 0,
    freeSpinsConsumed: 0,
    ...(bonus ? { bonus } : {})
  };
}

export function isInFreeSpins(state: FeatureState): boolean {
  return (state.freeSpinsRemaining ?? 0) > 0;
}

function bestFreeSpinAward(machine: MachineConfig, scatterWin?: ScatterWin): number {
  const triggers = machine.scatter?.triggers;
  if (!triggers?.length) return 0;
  if (!scatterWin) return 0;

  let best = 0;
  for (const t of triggers) {
    if (t.type !== "freespins") continue;
    if (scatterWin.count >= t.count) best = Math.max(best, t.value);
  }
  return best;
}

export function computeFreeSpinWinMultiplier(args: {
  machine: MachineConfig;
  /** how many free spins already consumed in current free spin session */
  consumed: number;
}): number {
  const prog: FreeSpinsMultiplierProgression | undefined =
    args.machine.features?.freeSpins?.multiplierProgression;

  if (!prog) return 1;

  if (prog.type === "fixed") return Math.max(1, prog.value);

  if (prog.type === "increment") {
    const raw = prog.start + prog.step * args.consumed;
    const capped = prog.cap ? Math.min(raw, prog.cap) : raw;
    return Math.max(1, capped);
  }

  // sequence
  const idx = args.consumed;
  if (idx < prog.values.length) return Math.max(1, prog.values[idx]!);
  return Math.max(1, prog.clamp ? prog.values[prog.values.length - 1]! : prog.values[idx % prog.values.length]!);
}

export function applyFreeSpinStateTransition(args: {
  machine: MachineConfig;
  prev: FeatureState;
  scatterWin?: ScatterWin;
  /** bonus-buy award, if any */
  bonusBuyAward?: number;
}): { next: FeatureState; events?: FeatureEvents } {
  const enabled = args.machine.features?.freeSpins?.enabled ?? true;

  const prevRemaining = args.prev.freeSpinsRemaining ?? 0;
  const prevConsumed = args.prev.freeSpinsConsumed ?? 0;

  const scatterAward = enabled ? bestFreeSpinAward(args.machine, args.scatterWin) : 0;
  const buyAward = enabled ? (args.bonusBuyAward ?? 0) : 0;
  const awarded = Math.max(scatterAward, 0) + Math.max(buyAward, 0);

  const events: FeatureEvents = {};
  let nextRemaining = prevRemaining;
  let nextConsumed = prevConsumed;

  if (prevRemaining > 0) {
    nextRemaining = prevRemaining - 1;
    nextConsumed = prevConsumed + 1;
    events.consumedFreeSpin = true;
  } else {
    // if not in free spins, consumed resets only when we newly enter via award
    nextConsumed = 0;
  }

  if (awarded > 0) {
    if (prevRemaining <= 0) {
      events.enteredFreeSpins = { awarded };
      // entering a new FS session => consumed should be 0 for first FS spin
      nextConsumed = 0;
    } else {
      events.retriggeredFreeSpins = { awarded };
    }
    nextRemaining += awarded;
  }

  const next: FeatureState = {
    freeSpinsRemaining: Math.max(0, nextRemaining),
    freeSpinsConsumed: Math.max(0, nextConsumed),
    ...(args.prev.bonus ? { bonus: args.prev.bonus } : {})
  };

  return Object.keys(events).length ? { next, events } : { next };
}
