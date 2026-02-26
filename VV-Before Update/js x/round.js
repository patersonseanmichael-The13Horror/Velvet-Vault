(function () {
  const PREFIX = "vv_round_v1_";

  function key(game) {
    return PREFIX + String(game || "default");
  }

  function makeRoundId(game) {
    const safeGame = String(game || "game")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .slice(0, 24) || "game";
    return `${safeGame}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function read(game) {
    try {
      const raw = sessionStorage.getItem(key(game));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.base !== "string") return null;
      const seq = Number(parsed.seq);
      return {
        base: parsed.base,
        seq: Number.isFinite(seq) && seq >= 0 ? Math.floor(seq) : 0
      };
    } catch {
      return null;
    }
  }

  function write(game, state) {
    try {
      sessionStorage.setItem(key(game), JSON.stringify({
        base: String(state.base),
        seq: Number(state.seq) || 0
      }));
    } catch {}
  }

  function ensure(game) {
    const existing = read(game);
    if (existing && existing.base) return existing.base;
    const base = makeRoundId(game);
    write(game, { base, seq: 0 });
    return base;
  }

  function current(game) {
    return read(game)?.base || "";
  }

  function nextDebitId(game) {
    const base = ensure(game);
    const currentState = read(game) || { base, seq: 0 };
    const out = `${base}-d${currentState.seq}`;
    write(game, { base, seq: currentState.seq + 1 });
    return out;
  }

  function clear(game) {
    try {
      sessionStorage.removeItem(key(game));
    } catch {}
  }

  function note(action, roundId) {
    const safeAction = String(action || "action").slice(0, 80);
    const safeRoundId = String(roundId || "").slice(0, 120);
    return `${safeAction}|roundId=${safeRoundId}`;
  }

  window.RoundEngine = {
    begin: ensure,
    current,
    nextDebitId,
    clear,
    note
  };
})();
