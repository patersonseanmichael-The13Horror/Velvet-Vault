# Slots Spin Contract (Server Authoritative)

## POST /slots/spin

### Request
```json
{
  "machineId": "noir_heist_5x3",
  "stake": 100,
  "denom": 1,
  "seed": "optional-replay-seed",
  "requestId": "optional-trace-id"
}
```

### Success response
```json
{
  "audit": {
    "machineId": "noir_heist_5x3",
    "machineVersion": "1.0.0",
    "configHash": "deadbeef",
    "seedUsed": "vd_xxx",
    "bet": { "stake": 100, "denom": 1 },
    "requestId": "abc",
    "timestampMs": 1700000000000
  },
  "outcome": {
    "grid": [["A","K","Q"],["Q","W","10"],["J","J","A"],["10","Q","S"],["A","A","K"]],
    "lineWins": [],
    "scatterWin": {
      "symbol": "S",
      "count": 3,
      "payoutMultiplier": 2,
      "payout": 200,
      "positions": [{"reel":3,"row":2}]
    },
    "totalPayout": 200,
    "totalPayoutMultiplier": 2
  }
}
```
