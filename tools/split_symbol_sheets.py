#!/usr/bin/env python3
"""
Velvet Vault - Split 4x4 symbol sprite sheets into per-machine symbols.

Input per machine:
  images/sheets/<machine>.png   (2048x2048, 4x4, 512 cell)

Output:
  images/symbols/<machine-slug>/*.webp  (512x512 each)

Run:
  pip install pillow
  python3 tools/split_symbol_sheets.py
"""

from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHEETS = ROOT / "images" / "sheets"
OUT = ROOT / "images" / "symbols"

GRID_COLS = 4
GRID_ROWS = 4
CELL = 512

ORDER = [
  "L_A", "L_K", "L_Q", "L_J",
  "L_10","P1",  "P2",  "P3",
  "P4", "WILD","SCATTER","COIN",
  "COIN_MULT","COIN_JP","EMPTY15","EMPTY16",
]

MACHINES = {
  "velvet-noir": "velvet-noir.png",
  "cyber-sakura": "cyber-sakura.png",
  "neon-pharaoh": "neon-pharaoh.png",
  "emerald-heist": "emerald-heist.png",
  "crimson-crown": "crimson-crown.png",
  "abyssal-pearl": "abyssal-pearl.png",
  "clockwork-vault": "clockwork-vault.png",
}

def split_one(sheet_path: Path, out_dir: Path):
  img = Image.open(sheet_path).convert("RGBA")
  w, h = img.size
  assert w == GRID_COLS*CELL and h == GRID_ROWS*CELL, f"{sheet_path.name} must be {GRID_COLS*CELL}x{GRID_ROWS*CELL}"

  out_dir.mkdir(parents=True, exist_ok=True)

  i = 0
  for r in range(GRID_ROWS):
    for c in range(GRID_COLS):
      name = ORDER[i]
      i += 1
      left = c * CELL
      top = r * CELL
      crop = img.crop((left, top, left+CELL, top+CELL))

      # Skip empties
      if name.startswith("EMPTY"):
        continue

      out_path = out_dir / f"{name}.webp"
      crop.save(out_path, "WEBP", quality=92, method=6)
      print("Wrote", out_path.relative_to(ROOT))

def main():
  if not SHEETS.exists():
    print("Missing folder:", SHEETS)
    print("Create it and place your sheets there.")
    return

  for slug, filename in MACHINES.items():
    sheet = SHEETS / filename
    if not sheet.exists():
      print("[SKIP] Missing sheet:", sheet.relative_to(ROOT))
      continue
    split_one(sheet, OUT / slug)

  print("Done.")

if __name__ == "__main__":
  main()
