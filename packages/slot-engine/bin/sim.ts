#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { MachineConfigSchema } from "../src/config/schema.js";
import { runSimulation } from "../src/sim/run.js";

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const configPath = parseArg("--config");
const spinsStr = parseArg("--spins") ?? "200000";
const stakeStr = parseArg("--stake") ?? "100";
const seedBase = parseArg("--seedBase") ?? "sim";

if (!configPath) {
  console.error("Usage: velvet-slot-sim --config <path.json> [--spins N] [--stake N] [--seedBase str]");
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

const stats = runSimulation({ machine: parsed.data, spins, stake, seedBase });

console.log("==== Simulation Results ====");
console.log(JSON.stringify(stats, null, 2));
