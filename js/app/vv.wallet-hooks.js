// Velvet Vault - Wallet Hooks (bets/wins/deposits/withdrawals)
// - Deduct on BET
// - Credit on WIN
// - Logs transactions for History page
//
// Wallet doc: wallets/{uid}
// {
//   cash, bonus, rolloverRemaining, maxWithdraw, activePromo, depositsCount
// }
//
(function(){
  const VV = window.VV;
  if (!VV || !VV.db || !VV.auth) return;

  const wallets = ()=> VV.db.collection("wallets");
  const txItems = (uid)=> VV.db.collection("transactions").doc(uid).collection("items");

  function now(){ return firebase.firestore.FieldValue.serverTimestamp(); }

  async function logTx(uid, item){
    await txItems(uid).add({ ...item, createdAt: now() });
  }

  // Deduct bet from wallet: cash first, then bonus.
  async function bet(amount, meta){
    amount = Number(amount || 0);
    if (!(amount > 0)) return { ok:false, reason:"invalid_amount" };
    const user = VV.auth.currentUser;
    if (!user) return { ok:false, reason:"not_authed" };
    const uid = user.uid;

    const wref = wallets().doc(uid);
    let result = { ok:false, cashUsed:0, bonusUsed:0, after:null };

    await VV.db.runTransaction(async (tx)=>{
      const ws = await tx.get(wref);
      const w = ws.exists ? ws.data() : {};
      const cash = Number(w.cash || 0);
      const bonus = Number(w.bonus || 0);
      const total = cash + bonus;
      if (total < amount) {
        result = { ok:false, reason:"insufficient_funds", total };
        return;
      }

      const cashUsed = Math.min(cash, amount);
      const bonusUsed = Math.max(0, amount - cashUsed);

      const newCash = +(cash - cashUsed).toFixed(2);
      const newBonus = +(bonus - bonusUsed).toFixed(2);

      // Rollover decreases by BET amount when rollover active (>0)
      let rolloverRemaining = Number(w.rolloverRemaining || 0);
      if (rolloverRemaining > 0) {
        rolloverRemaining = Math.max(0, +(rolloverRemaining - amount).toFixed(2));
      }

      tx.set(wref, {
        cash: newCash,
        bonus: newBonus,
        rolloverRemaining,
        updatedAt: now()
      }, { merge:true });

      result = { ok:true, cashUsed, bonusUsed, after:{ cash:newCash, bonus:newBonus, rolloverRemaining } };
    });

    if (result.ok){
      await logTx(uid, {
        type: "BET",
        amount: +amount.toFixed(2),
        game: meta?.game || "UNKNOWN",
        machine: meta?.machine || null,
        roundId: meta?.roundId || null,
        detail: {
          cashUsed: +result.cashUsed.toFixed(2),
          bonusUsed: +result.bonusUsed.toFixed(2),
        }
      });
    }
    return result;
  }

  // Credit win to wallet cash (wins always go to cash)
  async function win(amount, meta){
    amount = Number(amount || 0);
    if (!(amount > 0)) return { ok:false, reason:"invalid_amount" };
    const user = VV.auth.currentUser;
    if (!user) return { ok:false, reason:"not_authed" };
    const uid = user.uid;

    const wref = wallets().doc(uid);
    let after = null;

    await VV.db.runTransaction(async (tx)=>{
      const ws = await tx.get(wref);
      const w = ws.exists ? ws.data() : {};
      const cash = Number(w.cash || 0);
      const newCash = +(cash + amount).toFixed(2);
      tx.set(wref, { cash: newCash, updatedAt: now() }, { merge:true });
      after = { cash: newCash, bonus: Number(w.bonus||0), rolloverRemaining: Number(w.rolloverRemaining||0) };
    });

    await logTx(uid, {
      type: "WIN",
      amount: +amount.toFixed(2),
      game: meta?.game || "UNKNOWN",
      machine: meta?.machine || null,
      roundId: meta?.roundId || null
    });
    return { ok:true, after };
  }

  // Deposit credit (admin/manual verification will call this later; safe helper)
  async function deposit(amount, meta){
    amount = Number(amount || 0);
    if (!(amount > 0)) return { ok:false, reason:"invalid_amount" };
    const user = VV.auth.currentUser;
    if (!user) return { ok:false, reason:"not_authed" };
    const uid = user.uid;

    const wref = wallets().doc(uid);
    await VV.db.runTransaction(async (tx)=>{
      const ws = await tx.get(wref);
      const w = ws.exists ? ws.data() : {};
      const cash = Number(w.cash || 0);
      const depositsCount = Number(w.depositsCount || 0);
      tx.set(wref, {
        cash: +(cash + amount).toFixed(2),
        depositsCount,
        updatedAt: now()
      }, { merge:true });
    });
    await logTx(uid, { type:"DEPOSIT", amount:+amount.toFixed(2), detail: meta || {} });
    return { ok:true };
  }

  async function withdraw(amount, meta){
    amount = Number(amount || 0);
    if (!(amount > 0)) return { ok:false, reason:"invalid_amount" };
    const user = VV.auth.currentUser;
    if (!user) return { ok:false, reason:"not_authed" };
    const uid = user.uid;

    const wref = wallets().doc(uid);
    let res = { ok:false };
    await VV.db.runTransaction(async (tx)=>{
      const ws = await tx.get(wref);
      const w = ws.exists ? ws.data() : {};
      const cash = Number(w.cash || 0);
      const maxWithdraw = Number(w.maxWithdraw || 0);

      if (maxWithdraw > 0 && amount > maxWithdraw) {
        res = { ok:false, reason:"max_withdraw_exceeded", maxWithdraw };
        return;
      }
      if (cash < amount) {
        res = { ok:false, reason:"insufficient_cash", cash };
        return;
      }
      const newCash = +(cash - amount).toFixed(2);
      tx.set(wref, { cash:newCash, updatedAt: now() }, { merge:true });
      res = { ok:true, after:{ cash:newCash } };
    });

    if (res.ok){
      await logTx(uid, { type:"WITHDRAW", amount:+amount.toFixed(2), detail: meta || {} });
    }
    return res;
  }

  window.VVWallet = { bet, win, deposit, withdraw };
})();
