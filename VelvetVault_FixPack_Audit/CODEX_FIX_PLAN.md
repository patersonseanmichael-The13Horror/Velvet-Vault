# Velvet Vault — Codex Fix Pack

This folder is a cleaned structure + base stylesheet to prevent collisions.

## Goals
- One styling system: `css/velvet.css`
- One wallet system: `js/wallet.js` (VaultEngine)
- Page-specific game logic should move into `js/games/*` to avoid collisions.

## Key fixes already applied
- Replaced empty `css/velvet.css` with a real shared base style.
- Removed empty `assets/velvet-ambient.mp3` (was 1 byte). Added `assets/ADD_YOUR_AMBIENT_AUDIO_HERE.txt`.
- Added `images/IMAGES_README.txt` with naming rules.
- Added `js/games/` scaffolding for Codex to migrate inline scripts into modules.
- Ensured every HTML includes `<link rel="stylesheet" href="css/velvet.css">`.

## Codex tasks (DO THESE IN ORDER)
1) NAV consistency:
   - Ensure every page has the same header + nav links and correct filenames (all lowercase).
2) Paths for GitHub Pages:
   - Do NOT use leading slashes in href/src (e.g. avoid `/css/velvet.css`). Use `css/velvet.css` or `./css/velvet.css`.
3) Console clean:
   - Fix any `getElementById(...)` null errors (IDs mismatch).
4) Move inline scripts:
   - Migrate each page's inline `<script>` into the matching file in `js/games/`.
   - Keep wallet operations ONLY via `window.VaultEngine.debit/credit`.
5) Performance:
   - Compress `images/velvet-vault-hero.png` (< 500KB target).

## Timestamp
Generated: 2026-02-23T23:12:30.636623
