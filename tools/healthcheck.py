#!/usr/bin/env python3
"""
Velvet Vault — Repo Healthcheck (no dependencies)

Checks:
  - HTML references (href/src/link) point to existing local files
  - Missing css/pages wrappers (common breakage after Phase 2)
  - Reports duplicates of the same CSS file in a page <head>

Run:
  python3 tools/healthcheck.py
"""

from __future__ import annotations
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HTML_FILES = [
    "index.html",
    "login.html",
    "members.html",
    "ledger.html",
    "roulette.html",
    "blackjack.html",
    "poker.html",
    "slots.html",
]

REF_PATTERNS = [
    re.compile(r'<link[^>]+href="([^"]+)"', re.I),
    re.compile(r'<script[^>]+src="([^"]+)"', re.I),
    re.compile(r'<img[^>]+src="([^"]+)"', re.I),
    re.compile(r'<a[^>]+href="([^"]+)"', re.I),
]

def is_external(ref: str) -> bool:
    ref = ref.strip()
    return (
        ref.startswith("http://")
        or ref.startswith("https://")
        or ref.startswith("data:")
        or ref.startswith("mailto:")
        or ref.startswith("tel:")
        or ref.startswith("#")
    )

def norm_ref(ref: str) -> str:
    ref = ref.split("#", 1)[0]
    ref = ref.split("?", 1)[0]
    return ref.strip()

def main() -> int:
    ok = True
    print("Velvet Vault — healthcheck")
    print("Root:", ROOT)
    print()

    for html in HTML_FILES:
        path = ROOT / html
        if not path.exists():
            print(f"[MISSING] {html}")
            ok = False
            continue

        text = path.read_text(errors="ignore")
        head = text.split("</head>", 1)[0].lower()

        css_links = re.findall(r'<link[^>]+href="([^"]+)"', head, flags=re.I)
        css_norm = [norm_ref(x) for x in css_links if x]
        dups = {x for x in css_norm if css_norm.count(x) > 1}
        if dups:
          print(f"[DUP CSS] {html}: " + ", ".join(sorted(dups)))

        refs = []
        for pat in REF_PATTERNS:
            refs.extend(pat.findall(text))

        missing = []
        for ref in refs:
            ref = norm_ref(ref)
            if not ref or is_external(ref):
                continue
            if ref.startswith("#"):
                continue
            ref_path = (ROOT / ref.lstrip("/")).resolve()
            try:
                ref_path.relative_to(ROOT.resolve())
            except Exception:
                continue
            if not ref_path.exists():
                missing.append(ref)

        if missing:
            ok = False
            print(f"[BROKEN REFS] {html}")
            for m in sorted(set(missing)):
                print("  -", m)

    print()
    if ok:
        print("✅ Healthcheck PASSED — no missing local refs detected.")
        return 0
    print("❌ Healthcheck FAILED — fix missing refs listed above.")
    return 1

if __name__ == "__main__":
    raise SystemExit(main())

