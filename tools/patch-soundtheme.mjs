import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = join(__dirname, "../packages/vg-machines/index.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const machines = Array.isArray(registry) ? registry : (registry.machines || Object.values(registry));

// Appropriate soundTheme values for VG-04..VG-10 based on their vfxTheme/accentColor
const patches = {
  "VG-04": "crimson-pulse",
  "VG-05": "diamond-shimmer",
  "VG-06": "velvet-noir",
  "VG-07": "sapphire-hum",
  "VG-08": "gold-lounge",
  "VG-09": "purple-noir",
  "VG-10": "golden-vault",
};

let patched = 0;
for (const m of machines) {
  const id = m?.id;
  if (patches[id] && m.theme && !m.theme.soundTheme) {
    m.theme.soundTheme = patches[id];
    console.log(`Patched ${id} -> soundTheme=${patches[id]}`);
    patched++;
  }
}

// Write back in the same structure
const output = Array.isArray(registry) ? machines : { ...registry, machines };
writeFileSync(registryPath, JSON.stringify(output, null, 2) + "\n");
console.log(`\nPatched ${patched} machines. Registry saved.`);
