#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import type { MachineConfig } from "../src/types.js";
import { MachineConfigSchema } from "../src/config/schema.js";
import { runSimulation } from "../src/sim/run.js";
import { toCsv } from "../src/sim/stats.js";

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const configPath = parseArg("--config");
const spinsStr = parseArg("--spins") ?? "200000";
const stakeStr = parseArg("--stake") ?? "100";
const seedBase = parseArg("--seedBase") ?? "sim";
const csvOut = parseArg("--csvOut");

if (!configPath) {
  console.error("Usage: velvet-slot-sim --config <path.json> [--spins N] [--stake N] [--seedBase str] [--csvOut out.csv]");
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

const spins = Number(spinsStr);
const stake = Number(stakeStr);
if (!Number.isInteger(spins) || spins <= 0) throw new Error("--spins must be positive integer");
if (!Number.isInteger(stake) || stake <= 0) throw new Error("--stake must be positive integer");

const stats = runSimulation({ machine: parsed.data as MachineConfig, spins, stake, seedBase });

console.log("==== Simulation Results ====");
console.log(JSON.stringify(stats, null, 2));

if (csvOut) {
  const outAbs = path.resolve(process.cwd(), csvOut);
  fs.writeFileSync(outAbs, toCsv(stats), "utf8");
  console.log(`[sim] CSV written to ${outAbs}`);
}
