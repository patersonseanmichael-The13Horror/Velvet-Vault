/* © 2026 Velvet Vault — Sean Michael Paterson. All rights reserved. */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = join(__dirname, "../packages/vg-machines/index.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const machines = Array.isArray(registry) ? registry : (registry.machines || Object.values(registry));

let missing = 0;
for (const m of machines) {
  const id = m?.id ?? "unknown";
  const soundTheme = m?.theme?.soundTheme;
  if (!soundTheme) {
    console.log(`MISSING  ${id}  theme=${JSON.stringify(m?.theme ?? {})}`);
    missing++;
  } else {
    console.log(`OK       ${id}  soundTheme=${soundTheme}`);
  }
}
console.log(`\n${missing === 0 ? "All OK" : `${missing} machines missing soundTheme`}`);
