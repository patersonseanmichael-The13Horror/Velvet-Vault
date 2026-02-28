# @velvet/slot-engine (Slot Engine 2.0) - Paylines MVP

## Install / build
- `npm i`
- `npm run build`

## Run simulator
- `npm run sim`
- or `velvet-slot-sim --config ./src/config/sample.noirHeist.5x3.20l.json --spins 1000000 --stake 100`

## Engine usage
```ts
import { spin } from "@velvet/slot-engine";
import machine from "./machine.json";

const result = spin({
  machine,
  bet: { stake: 100 },
  seed: "replay:123"
});

console.log(result.outcome.totalPayout);
```

## Notes
- Outcomes are server-authoritative. Client should only render `SpinResult`.
- Replace `fnv1a32` with SHA-256 in the backend if you need stronger tamper resistance.
