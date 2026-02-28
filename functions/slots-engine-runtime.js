const crypto = require("node:crypto");

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function fnv1a64(input) {
  let hash = FNV_OFFSET;
  const str = String(input || "velvet-vault-default-seed");
  for (let index = 0; index < str.length; index += 1) {
    hash ^= BigInt(str.charCodeAt(index));
    hash = (hash * FNV_PRIME) & MASK_64;
  }
  return hash;
}

function splitMix64(state) {
  let z = (state + 0x9e3779b97f4a7c15n) & MASK_64;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK_64;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK_64;
  return (z ^ (z >> 31n)) & MASK_64;
}

class SeededRng {
  constructor(seed) {
    this.state = fnv1a64(seed);
  }

  nextFloat() {
    this.state = splitMix64(this.state);
    const upper53 = Number((this.state >> 11n) & 0x1fffffffffffffn);
    return upper53 / 0x20000000000000;
  }

  nextInt(maxExclusive) {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
      return 0;
    }
    return Math.floor(this.nextFloat() * maxExclusive);
  }
}

function createRng(seed, roundId) {
  const serverSeedId = seed && String(seed).trim() ? "seeded-dev" : crypto.randomUUID();
  const mixedSeed = seed && String(seed).trim()
    ? `${String(seed).trim()}:${roundId}`
    : sha256(`${serverSeedId}:${roundId}`);
  return {
    rng: new SeededRng(mixedSeed),
    seed: mixedSeed,
    serverSeedId
  };
}

function normalizeFeatureState(state) {
  if (!state || typeof state !== "object") {
    return { freeSpinsRemaining: 0, freeSpinsMultiplier: 1, activeBonusId: null, totalBonusWin: 0 };
  }
  return {
    freeSpinsRemaining: Math.max(0, Math.floor(Number(state.freeSpinsRemaining) || 0)),
    freeSpinsMultiplier: Math.max(1, Number(state.freeSpinsMultiplier || 1)),
    activeBonusId: state.activeBonusId || null,
    totalBonusWin: Math.max(0, Math.floor(Number(state.totalBonusWin) || 0))
  };
}

function activeSpinMultiplier(state) {
  return state.freeSpinsRemaining > 0 ? Math.max(1, state.freeSpinsMultiplier) : 1;
}

function stakeChargedForSpin(state, bet) {
  return state.freeSpinsRemaining > 0 ? 0 : Math.max(0, Math.floor(Number(bet) || 0));
}

function pickWeighted(rng, symbols) {
  if (!Array.isArray(symbols) || symbols.length === 0) return "";
  const total = symbols.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
  if (total <= 0) return symbols[rng.nextInt(symbols.length)].symbol;
  let roll = rng.nextFloat() * total;
  for (const entry of symbols) {
    roll -= Math.max(0, Number(entry.weight) || 0);
    if (roll <= 0) return entry.symbol;
  }
  return symbols[symbols.length - 1].symbol;
}

function sampleReplacementSymbol(config, rng, reel) {
  if (config.model.type === "weightedReels") {
    return pickWeighted(rng, config.model.reels[reel] || config.model.reels[config.model.reels.length - 1] || []);
  }
  return pickWeighted(rng, config.model.symbols || []);
}

function sampleInitialGrid(config, rng) {
  const rows = config.layout.rows;
  const reels = config.layout.reels;
  return Array.from({ length: rows }, (_, row) => Array.from({ length: reels }, (_, reel) => {
    if (config.model.type === "weightedReels") {
      return pickWeighted(rng, config.model.reels[reel] || config.model.reels[config.model.reels.length - 1] || []);
    }
    return pickWeighted(rng, config.model.symbols || []);
  }));
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function uniquePositions(positions) {
  const seen = new Set();
  return positions.filter((position) => {
    const key = `${position.reel}:${position.row}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function removeAndRefill(grid, removedPositions, config, rng) {
  const rows = grid.length;
  const reels = grid[0] ? grid[0].length : 0;
  const removedByReel = new Map();
  removedPositions.forEach((position) => {
    const set = removedByReel.get(position.reel) || new Set();
    set.add(position.row);
    removedByReel.set(position.reel, set);
  });

  const next = Array.from({ length: rows }, () => Array(reels).fill(""));
  for (let reel = 0; reel < reels; reel += 1) {
    const survivors = [];
    for (let row = rows - 1; row >= 0; row -= 1) {
      if (removedByReel.get(reel)?.has(row)) continue;
      survivors.push(grid[row][reel]);
    }
    while (survivors.length < rows) {
      survivors.push(sampleReplacementSymbol(config, rng, reel));
    }
    for (let row = rows - 1, index = 0; row >= 0; row -= 1, index += 1) {
      next[row][reel] = survivors[index];
    }
  }
  return next;
}

function countScatters(grid, config) {
  const scatters = new Set(config.symbols.scatters || []);
  if (scatters.size === 0) return 0;
  let count = 0;
  grid.forEach((row) => row.forEach((symbol) => { if (scatters.has(symbol)) count += 1; }));
  return count;
}

function evaluatePaylines(grid, config, lineBet) {
  const rules = config.lineRules;
  const wild = config.symbols.wild;
  const scatters = new Set(config.symbols.scatters || []);
  const wins = [];

  rules.paylines.forEach((line, lineIndex) => {
    const sequence = line.map((row, reel) => grid[row] && grid[row][reel] ? grid[row][reel] : "");
    const candidates = Array.from(new Set(sequence.filter((symbol) => symbol && !scatters.has(symbol))));
    if (wild && rules.paytable[wild]) candidates.push(wild);

    let best = null;
    candidates.forEach((candidate) => {
      if (!rules.paytable[candidate]) return;
      let count = 0;
      const positions = [];
      for (let reel = 0; reel < sequence.length; reel += 1) {
        const symbol = sequence[reel];
        const matched = symbol === candidate || (wild ? symbol === wild && candidate !== wild : false);
        if (!matched) break;
        count += 1;
        positions.push({ reel, row: line[reel] });
      }
      const multiplier = Number((rules.paytable[candidate] || {})[count] || 0);
      if (count <= 0 || multiplier <= 0) return;
      const payout = Math.floor(multiplier * lineBet);
      const win = { id: `line-${lineIndex}-${candidate}-${count}`, kind: "line", symbol: candidate, count, lineIndex, payout, multiplier, positions };
      if (!best || win.payout > best.payout || (win.payout === best.payout && win.count > best.count)) {
        best = win;
      }
    });

    if (best) wins.push(best);
  });

  const totalWin = wins.reduce((sum, win) => sum + win.payout, 0);
  return {
    mode: "paylines",
    wins,
    steps: [{ stepIndex: 0, mode: "paylines", multiplier: 1, grid: cloneGrid(grid), wins, stepPayout: totalWin, removedPositions: [] }],
    totalWin,
    finalGrid: cloneGrid(grid)
  };
}

function evaluateWays(grid, config, lineBet) {
  const rules = config.waysRules;
  const wild = config.symbols.wild;
  const scatters = new Set(config.symbols.scatters || []);
  const wins = [];

  Object.keys(rules.paytable).forEach((candidate) => {
    if (!candidate || scatters.has(candidate)) return;
    let matchedReels = 0;
    let waysCount = 1;
    const positions = [];
    for (let reel = 0; reel < config.layout.reels; reel += 1) {
      let reelMatches = 0;
      for (let row = 0; row < config.layout.rows; row += 1) {
        const symbol = grid[row] && grid[row][reel] ? grid[row][reel] : "";
        const matched = symbol === candidate || (wild ? symbol === wild && candidate !== wild : false);
        if (matched) {
          reelMatches += 1;
          positions.push({ reel, row });
        }
      }
      if (reelMatches === 0) break;
      matchedReels += 1;
      waysCount *= reelMatches;
    }
    if (matchedReels < rules.minMatch) return;
    const multiplier = Number((rules.paytable[candidate] || {})[matchedReels] || 0);
    if (multiplier <= 0) return;
    wins.push({
      id: `ways-${candidate}-${matchedReels}`,
      kind: "ways",
      symbol: candidate,
      count: matchedReels,
      ways: waysCount,
      payout: Math.floor(multiplier * lineBet * waysCount),
      multiplier,
      positions
    });
  });

  const totalWin = wins.reduce((sum, win) => sum + win.payout, 0);
  return {
    mode: "ways",
    wins,
    steps: [{ stepIndex: 0, mode: "ways", multiplier: 1, grid: cloneGrid(grid), wins, stepPayout: totalWin, removedPositions: [] }],
    totalWin,
    finalGrid: cloneGrid(grid)
  };
}

function neighborCells(row, reel, rows, reels, adjacency) {
  const deltas = adjacency === 8
    ? [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
    : [[-1, 0], [0, -1], [0, 1], [1, 0]];
  return deltas
    .map(([rowDelta, reelDelta]) => ({ row: row + rowDelta, reel: reel + reelDelta }))
    .filter((next) => next.row >= 0 && next.row < rows && next.reel >= 0 && next.reel < reels);
}

function closestPay(paytable, count) {
  let bestCount = 0;
  let bestPay = 0;
  Object.entries(paytable || {}).forEach(([rawCount, rawPay]) => {
    const payCount = Number(rawCount);
    const pay = Number(rawPay || 0);
    if (payCount <= count && payCount >= bestCount && pay > 0) {
      bestCount = payCount;
      bestPay = pay;
    }
  });
  return bestPay;
}

function detectClusters(grid, candidate, wild, adjacency) {
  const rows = grid.length;
  const reels = grid[0] ? grid[0].length : 0;
  const visited = new Set();
  const clusters = [];

  for (let row = 0; row < rows; row += 1) {
    for (let reel = 0; reel < reels; reel += 1) {
      const key = `${reel}:${row}`;
      const symbol = grid[row][reel];
      const eligible = symbol === candidate || (wild ? symbol === wild : false);
      if (!eligible || visited.has(key)) continue;

      const cluster = [];
      const stack = [{ row, reel }];
      visited.add(key);
      while (stack.length > 0) {
        const current = stack.pop();
        cluster.push({ reel: current.reel, row: current.row });
        neighborCells(current.row, current.reel, rows, reels, adjacency).forEach((next) => {
          const nextKey = `${next.reel}:${next.row}`;
          if (visited.has(nextKey)) return;
          const nextSymbol = grid[next.row][next.reel];
          const nextEligible = nextSymbol === candidate || (wild ? nextSymbol === wild : false);
          if (!nextEligible) return;
          visited.add(nextKey);
          stack.push(next);
        });
      }
      clusters.push(cluster);
    }
  }

  return clusters;
}

function evaluateCluster(grid, config, lineBet, rng) {
  const rules = config.clusterRules;
  const wild = config.symbols.wild;
  const scatters = new Set(config.symbols.scatters || []);
  const candidates = Object.keys(rules.paytable).filter((symbol) => symbol && !scatters.has(symbol));
  const multipliers = rules.multipliers || [];
  const maxSteps = Math.max(1, Number(rules.maxSteps || 1));
  const steps = [];
  const wins = [];
  let totalWin = 0;
  let currentGrid = cloneGrid(grid);

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex += 1) {
    const stepMultiplier = Number(multipliers[stepIndex] || 1);
    const candidateWins = [];
    candidates.forEach((candidate) => {
      detectClusters(currentGrid, candidate, wild, rules.adjacency).forEach((cluster, clusterIndex) => {
        if (cluster.length < rules.minClusterSize) return;
        const basePay = closestPay(rules.paytable[candidate], cluster.length);
        if (basePay <= 0) return;
        candidateWins.push({
          id: `cluster-${stepIndex}-${candidate}-${clusterIndex}`,
          kind: "cluster",
          symbol: candidate,
          count: cluster.length,
          payout: Math.floor(basePay * lineBet * stepMultiplier),
          multiplier: stepMultiplier,
          positions: cluster
        });
      });
    });

    candidateWins.sort((left, right) => right.payout - left.payout || right.count - left.count);
    const selected = [];
    const used = new Set();
    candidateWins.forEach((win) => {
      const overlaps = win.positions.some((position) => used.has(`${position.reel}:${position.row}`));
      if (overlaps) return;
      win.positions.forEach((position) => used.add(`${position.reel}:${position.row}`));
      selected.push(win);
    });

    const removedPositions = uniquePositions(selected.flatMap((win) => win.positions));
    const stepPayout = selected.reduce((sum, win) => sum + win.payout, 0);
    const refilledGrid = removedPositions.length > 0 ? removeAndRefill(currentGrid, removedPositions, config, rng) : cloneGrid(currentGrid);
    steps.push({
      stepIndex,
      mode: "cluster",
      multiplier: stepMultiplier,
      grid: cloneGrid(currentGrid),
      wins: selected,
      stepPayout,
      removedPositions,
      refilledGrid: cloneGrid(refilledGrid)
    });
    wins.push(...selected);
    totalWin += stepPayout;
    currentGrid = refilledGrid;
    if (selected.length === 0) break;
  }

  return { mode: "cluster", wins, steps, totalWin, finalGrid: currentGrid };
}

function evaluateCascade(grid, config, lineBet, rng) {
  const rules = config.cascadeRules;
  const multipliers = rules.multipliers || [];
  const maxSteps = Math.max(1, Number(rules.maxSteps || 1));
  const steps = [];
  const wins = [];
  let totalWin = 0;
  let currentGrid = cloneGrid(grid);

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex += 1) {
    const baseResult = rules.baseMode === "ways"
      ? evaluateWays(currentGrid, { ...config, mode: "ways" }, lineBet)
      : evaluatePaylines(currentGrid, { ...config, mode: "paylines" }, lineBet);
    const stepMultiplier = Number(multipliers[stepIndex] || 1);
    const stepWins = baseResult.wins.map((win, index) => ({
      ...win,
      id: `${win.id}-cascade-${stepIndex}-${index}`,
      payout: Math.floor(win.payout * stepMultiplier),
      multiplier: Number((win.multiplier * stepMultiplier).toFixed(4))
    }));
    const removedPositions = uniquePositions(stepWins.flatMap((win) => win.positions));
    const stepPayout = stepWins.reduce((sum, win) => sum + win.payout, 0);
    const refilledGrid = removedPositions.length > 0 ? removeAndRefill(currentGrid, removedPositions, config, rng) : cloneGrid(currentGrid);
    steps.push({
      stepIndex,
      mode: "cascade",
      multiplier: stepMultiplier,
      grid: cloneGrid(currentGrid),
      wins: stepWins,
      stepPayout,
      removedPositions,
      refilledGrid: cloneGrid(refilledGrid)
    });
    wins.push(...stepWins);
    totalWin += stepPayout;
    currentGrid = refilledGrid;
    if (stepWins.length === 0) break;
  }

  return { mode: "cascade", wins, steps, totalWin, finalGrid: currentGrid };
}

function evaluateMode(grid, config, lineBet, rng) {
  if (config.mode === "paylines") return evaluatePaylines(grid, config, lineBet);
  if (config.mode === "ways") return evaluateWays(grid, config, lineBet);
  if (config.mode === "cascade") return evaluateCascade(grid, config, lineBet, rng);
  if (config.mode === "cluster") return evaluateCluster(grid, config, lineBet, rng);
  throw new Error(`Unsupported slot mode: ${config.mode}`);
}

function applyGlobalMultiplier(evaluation, multiplier) {
  if (multiplier === 1) return evaluation;
  return {
    ...evaluation,
    wins: evaluation.wins.map((win) => ({
      ...win,
      payout: Math.floor(win.payout * multiplier),
      multiplier: Number((win.multiplier * multiplier).toFixed(4))
    })),
    steps: evaluation.steps.map((step) => ({
      ...step,
      multiplier: Number((step.multiplier * multiplier).toFixed(4)),
      stepPayout: Math.floor(step.stepPayout * multiplier),
      wins: step.wins.map((win) => ({
        ...win,
        payout: Math.floor(win.payout * multiplier),
        multiplier: Number((win.multiplier * multiplier).toFixed(4))
      }))
    })),
    totalWin: Math.floor(evaluation.totalWin * multiplier)
  };
}

function transitionFeatureState(config, previous, scatterCount, awardedWin) {
  const next = normalizeFeatureState(previous);
  const feature = config.features && config.features.freeSpins ? config.features.freeSpins : null;
  const wasBonusSpin = next.freeSpinsRemaining > 0;

  if (wasBonusSpin) {
    next.freeSpinsRemaining -= 1;
    if (next.freeSpinsRemaining <= 0) {
      next.freeSpinsRemaining = 0;
      next.freeSpinsMultiplier = 1;
      next.activeBonusId = null;
    }
    next.totalBonusWin += Math.max(0, Math.floor(awardedWin || 0));
  }

  if (feature && scatterCount >= feature.triggerScatterCount) {
    const awarded = wasBonusSpin
      ? Math.max(0, Math.floor(feature.retriggerSpins || feature.awardSpins || 0))
      : Math.max(0, Math.floor(feature.awardSpins || 0));
    if (awarded > 0) {
      next.freeSpinsRemaining += awarded;
      next.freeSpinsMultiplier = Math.max(1, Number(feature.multiplier || 1));
      next.activeBonusId = feature.id;
    }
  }

  return next;
}

function bigWinTier(totalWin, bet) {
  if (bet <= 0 || totalWin <= 0) return "none";
  const ratio = totalWin / bet;
  if (ratio >= 100) return "mega";
  if (ratio >= 50) return "big";
  if (ratio >= 20) return "medium";
  return "small";
}

function runSpin(config, request) {
  const bet = Math.max(1, Math.floor(Number(request.bet) || 0));
  const denom = Math.max(1, Math.floor(Number(request.denom) || 0));
  const priorState = normalizeFeatureState(request.featureState);
  const stakeCharged = stakeChargedForSpin(priorState, bet);
  const lineBet = config.lineRules && config.lineRules.lines ? Math.max(1, Math.floor(bet / config.lineRules.lines)) : bet;
  const rngPack = createRng(request.seed, request.roundId);
  const initialGrid = sampleInitialGrid(config, rngPack.rng);
  const baseEvaluation = evaluateMode(initialGrid, config, lineBet, rngPack.rng);
  const finalEvaluation = applyGlobalMultiplier(baseEvaluation, activeSpinMultiplier(priorState));
  const scatterCount = countScatters(initialGrid, config);
  const featureState = transitionFeatureState(config, priorState, scatterCount, finalEvaluation.totalWin);
  const configHash = sha256(stableJson(config));
  const outcomeHash = sha256(stableJson({
    grid: initialGrid,
    finalGrid: finalEvaluation.finalGrid,
    wins: finalEvaluation.wins,
    steps: finalEvaluation.steps,
    totalWin: finalEvaluation.totalWin,
    featureState
  }));

  const result = {
    configId: config.id,
    roundId: request.roundId,
    mode: config.mode,
    seed: rngPack.seed,
    serverSeedId: rngPack.serverSeedId,
    configHash,
    grid: initialGrid,
    finalGrid: finalEvaluation.finalGrid,
    steps: finalEvaluation.steps,
    wins: finalEvaluation.wins,
    totalWin: finalEvaluation.totalWin,
    totalMultiplier: Number((finalEvaluation.totalWin / bet).toFixed(6)),
    hit: finalEvaluation.totalWin > 0,
    stakeCharged,
    featureState,
    animationHints: {
      anticipation: scatterCount >= 2,
      nearMiss: scatterCount === Math.max(0, ((config.features && config.features.freeSpins && config.features.freeSpins.triggerScatterCount) || 3) - 1),
      bigWinTier: bigWinTier(finalEvaluation.totalWin, bet)
    }
  };

  const audit = {
    timestamp: new Date().toISOString(),
    configId: config.id,
    configHash,
    roundId: request.roundId,
    mode: config.mode,
    seed: rngPack.seed,
    serverSeedId: rngPack.serverSeedId,
    bet,
    denom,
    stakeCharged,
    totalWin: finalEvaluation.totalWin,
    outcomeHash,
    stepCount: finalEvaluation.steps.length,
    walletTransactionIds: []
  };

  return { result, audit };
}

module.exports = {
  runSpin
};
