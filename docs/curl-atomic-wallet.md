# cURL Atomic Wallet

## 1) Get an ID token
In the browser console after login:

```js
firebase.auth().currentUser.getIdToken().then((token) => console.log(token));
```

Set shell vars:

```bash
export ID_TOKEN="paste_firebase_id_token_here"
export PROJECT="the-velvet-vault-11bd2"
export REGION="us-central1"
```

## 2) Reserve

```bash
curl -s "https://${REGION}-${PROJECT}.cloudfunctions.net/vvReserveBet" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"data":{"roundId":"r1","amount":1000,"meta":{"game":"slots","machineId":"noir"}}}'
```

## 3) Settle

```bash
curl -s "https://${REGION}-${PROJECT}.cloudfunctions.net/vvSettleBet" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"data":{"roundId":"r1","payout":1500,"meta":{"game":"slots"}}}'
```

## 4) Cancel

```bash
curl -s "https://${REGION}-${PROJECT}.cloudfunctions.net/vvCancelBet" \
  -H "Authorization: Bearer ${ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"data":{"roundId":"r2","reason":"spin_failed"}}'
```

## Client integration

```js
async function atomicSpin({ machineId, stakeCents }) {
  const roundId = crypto.randomUUID();
  await VaultEngine.reserveBet({ roundId, amount: stakeCents, meta: { game: "slots", machineId } });

  try {
    const spinRes = await fetch("/api/slots/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machineId, stake: stakeCents, roundId })
    }).then((response) => response.json());

    const payout = Math.max(0, spinRes?.outcome?.totalPayout ?? 0);
    await VaultEngine.settleBet({ roundId, payout, meta: { game: "slots", machineId } });
    return spinRes;
  } catch (error) {
    await VaultEngine.cancelBet({ roundId, reason: "spin_failed" });
    throw error;
  }
}
```
