export class SlotsEngine {
  constructor(config) {
    this.config = config;
    this.reels = 5;
    this.rows = 3;
    this.paylines = Array.isArray(config.paylines) ? config.paylines : [];
    this.spinning = false;

    const symbols = Array.isArray(config.symbols) ? config.symbols : [];
    this.symbols = symbols;
    this.weightMap = config.weights || {};
    this.totalWeight = symbols.reduce((sum, symbol) => sum + this.#weight(symbol), 0);
  }

  #weight(symbol) {
    const raw = Number(this.weightMap[symbol]);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  }

  #randomSymbol(exclude = null) {
    const usable = exclude ? this.symbols.filter((s) => s !== exclude) : this.symbols;
    if (!usable.length) return "?";

    const total = usable.reduce((sum, symbol) => sum + this.#weight(symbol), 0);
    let pick = Math.random() * total;
    for (const symbol of usable) {
      pick -= this.#weight(symbol);
      if (pick <= 0) return symbol;
    }
    return usable[usable.length - 1];
  }

  randomGrid() {
    const grid = [];
    for (let row = 0; row < this.rows; row += 1) {
      const rowValues = [];
      for (let reel = 0; reel < this.reels; reel += 1) {
        rowValues.push(this.#randomSymbol());
      }
      grid.push(rowValues);
    }
    return grid;
  }

  #cloneGrid(grid) {
    return grid.map((row) => [...row]);
  }

  #lineCells(line) {
    return line.map((row, reel) => ({ row, reel }));
  }

  evaluate(grid, lineBet) {
    const wins = [];
    let totalWin = 0;

    this.paylines.forEach((line, index) => {
      const firstRow = line[0];
      const first = grid[firstRow]?.[0];
      if (!first || !this.config.paytable[first]) return;

      let count = 1;
      for (let reel = 1; reel < this.reels; reel += 1) {
        const row = line[reel];
        if (grid[row]?.[reel] === first) count += 1;
        else break;
      }

      if (count < 3) return;
      const mult = Number(this.config.paytable[first]?.[count] || 0);
      if (!mult) return;

      const payout = Math.floor(lineBet * mult);
      totalWin += payout;
      wins.push({
        index,
        symbol: first,
        count,
        mult,
        payout,
        cells: this.#lineCells(line).slice(0, count)
      });
    });

    return {
      wins,
      totalWin,
      isWin: totalWin > 0,
      totalMultiplier: lineBet > 0 ? Number((totalWin / lineBet).toFixed(2)) : 0
    };
  }

  #bestJackpotSymbol() {
    let bestSymbol = this.symbols[0] || "?";
    let best = -1;
    this.symbols.forEach((symbol) => {
      const candidate = Number(this.config.paytable[symbol]?.[5] || 0);
      if (candidate > best) {
        best = candidate;
        bestSymbol = symbol;
      }
    });
    return bestSymbol;
  }

  #chooseWinSymbol() {
    const candidates = this.symbols.filter((symbol) => this.config.paytable[symbol]?.[3]);
    if (!candidates.length) return this.symbols[0] || "?";

    const weighted = candidates.map((symbol) => {
      const base = Number(this.config.paytable[symbol]?.[3] || 1);
      return { symbol, score: 1 / Math.max(base, 1) };
    });

    const total = weighted.reduce((sum, item) => sum + item.score, 0);
    let pick = Math.random() * total;
    for (const item of weighted) {
      pick -= item.score;
      if (pick <= 0) return item.symbol;
    }
    return weighted[weighted.length - 1].symbol;
  }

  #chooseMatchCount() {
    const v = this.config.volatility || {};
    const payoutMin = Number(v.payoutMultMin || 2);
    const payoutMax = Number(v.payoutMultMax || 30);
    const spread = Math.max(1, payoutMax - payoutMin);

    const highBias = Math.min(0.45, spread / 120);
    const roll = Math.random();
    if (roll < 0.7 - highBias) return 3;
    if (roll < 0.92 - (highBias * 0.5)) return 4;
    return 5;
  }

  #forceLineWin(grid, lineIndex, symbol, count) {
    const out = this.#cloneGrid(grid);
    const line = this.paylines[lineIndex];
    if (!line) return out;

    for (let reel = 0; reel < this.reels; reel += 1) {
      const row = line[reel];
      if (reel < count) {
        out[row][reel] = symbol;
      } else if (out[row][reel] === symbol) {
        out[row][reel] = this.#randomSymbol(symbol);
      }
    }
    return out;
  }

  #forceNoWin(grid, lineBet) {
    let out = this.#cloneGrid(grid);
    let evalResult = this.evaluate(out, lineBet);

    let safety = 0;
    while (evalResult.totalWin > 0 && safety < 20) {
      evalResult.wins.forEach((win) => {
        const first = win.cells[0];
        if (!first) return;
        out[first.row][first.reel] = this.#randomSymbol(win.symbol);
      });
      evalResult = this.evaluate(out, lineBet);
      safety += 1;
    }

    if (evalResult.totalWin > 0) {
      for (let attempts = 0; attempts < 60; attempts += 1) {
        const randomGrid = this.randomGrid();
        const check = this.evaluate(randomGrid, lineBet);
        if (check.totalWin === 0) return randomGrid;
      }
    }

    return out;
  }

  #applyNearMiss(grid) {
    const out = this.#cloneGrid(grid);
    const lineIndex = Math.floor(Math.random() * this.paylines.length);
    const line = this.paylines[lineIndex];
    if (!line) return out;

    const symbol = this.#chooseWinSymbol();
    out[line[0]][0] = symbol;
    out[line[1]][1] = symbol;
    out[line[2]][2] = this.#randomSymbol(symbol);
    return out;
  }

  #buildSpinGrid(lineBet) {
    const v = this.config.volatility || {};
    const hitRate = Number(v.hitRate || 0.3);
    const nearMissChance = Number(v.nearMissChance || 0);
    const jackpotChance = Number(v.jackpotChance || 0);

    const jackpotHit = Math.random() < jackpotChance;
    const wantWin = jackpotHit || Math.random() < hitRate;

    let grid = this.randomGrid();

    if (jackpotHit) {
      const jackpotSymbol = this.#bestJackpotSymbol();
      const lineIndex = Math.floor(Math.random() * this.paylines.length);
      grid = this.#forceLineWin(grid, lineIndex, jackpotSymbol, 5);
      return { grid, jackpotHit, nearMiss: false };
    }

    if (wantWin) {
      const lineIndex = Math.floor(Math.random() * this.paylines.length);
      const symbol = this.#chooseWinSymbol();
      const count = this.#chooseMatchCount();
      grid = this.#forceLineWin(grid, lineIndex, symbol, count);

      let check = this.evaluate(grid, lineBet);
      if (check.totalWin <= 0) {
        for (let attempts = 0; attempts < 30; attempts += 1) {
          const fallbackLine = Math.floor(Math.random() * this.paylines.length);
          grid = this.#forceLineWin(this.randomGrid(), fallbackLine, symbol, 3);
          check = this.evaluate(grid, lineBet);
          if (check.totalWin > 0) break;
        }
      }
      return { grid, jackpotHit: false, nearMiss: false };
    }

    grid = this.#forceNoWin(grid, lineBet);

    let nearMiss = false;
    if (Math.random() < nearMissChance) {
      const withNearMiss = this.#applyNearMiss(grid);
      const check = this.evaluate(withNearMiss, lineBet);
      if (check.totalWin === 0) {
        grid = withNearMiss;
        nearMiss = true;
      }
    }

    return { grid, jackpotHit: false, nearMiss };
  }

  spin({ bet }) {
    if (this.spinning) {
      return { blocked: true, reason: "already-spinning" };
    }

    this.spinning = true;
    try {
      const paylineCount = this.paylines.length || 1;
      const lineBet = Math.max(1, bet / paylineCount);

      const built = this.#buildSpinGrid(lineBet);
      const outcome = this.evaluate(built.grid, lineBet);
      const totalWin = outcome.totalWin;

      return {
        blocked: false,
        grid: built.grid,
        lineBet,
        wins: outcome.wins,
        totalWin,
        totalMultiplier: outcome.totalMultiplier,
        isWin: outcome.isWin,
        isBigWin: totalWin >= (bet * 5),
        jackpotHit: built.jackpotHit,
        nearMiss: built.nearMiss
      };
    } finally {
      this.spinning = false;
    }
  }
}
