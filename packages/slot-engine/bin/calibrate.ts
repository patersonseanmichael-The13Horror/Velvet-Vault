#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import type { MachineConfig } from "../src/types.js";
import { MachineConfigSchema } from "../src/config/schema.js";
import { calibrateRtp } from "../src/tools/rtpCalibrate.js";

function arg(flag: string, def?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return def;
  return process.argv[i + 1] ?? def;
}

const configPath = arg("--config");
const outPath = arg("--out", "./tuned.machine.json")!;
const target = Number(arg("--target", "0.962"));
const spins = Number(arg("--spinsPerIter", "200000"));
const iters = Number(arg("--iters", "10"));
const stake = Number(arg("--stake", "100"));

if (!configPath) {
  console.error("Usage: node dist/bin/calibrate.js --config <machine.json> --out <out.json> --target 0.962 --spinsPerIter 200000 --iters 10 --stake 100");
  process.exit(1);
}

const abs = path.resolve(process.cwd(), configPath);
const raw = fs.readFileSync(abs, "utf8");
const json = JSON.parse(raw);
const parsed = MachineConfigSchema.safeParse(json);
if (!parsed.success) {
  console.error(parsed.error.format());
  process.exit(1);
}

const { tuned, history } = calibrateRtp({
  machine: parsed.data as MachineConfig,
  targetRtp: target,
  spinsPerIter: spins,
  iterations: iters,
  stake,
  seedBase: "cal"
});

fs.writeFileSync(path.resolve(process.cwd(), outPath), JSON.stringify(tuned, null, 2), "utf8");
console.log("Calibration history:");
console.log(history.map((h) => `${h.iter}: ${h.rtp.toFixed(6)}`).join("\n"));
console.log(`Tuned config written to ${outPath}`);
