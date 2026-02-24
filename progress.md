Original prompt: Audit Velvet Vault project.

Fix:
• Navigation links broken
• Responsive layout issues
• Duplicate CSS or JS
• Image path errors
• Firebase auth wiring
• Wallet persistence
• Visual upgrades (Velvet neon theme)
• Ensure all pages load 100%

Velvet Vault is the only active project.

Work log:
- Audited all top-level HTML pages and js/* modules.
- Fixed dead links in index and members so all href/src targets now exist.
- Hardened Firebase/auth wiring against missing init state (firebase-init, auth, guard, wallet).
- Added wallet backward-compat migration for legacy localStorage key and cross-tab storage sync.
- Upgraded ledger visual styling to Velvet neon theme and added responsive table wrapper.
- Removed ambient audio hard reference to missing mp3 and added safe unavailable handling.

Validation notes:
- Static missing-path check across all HTML href/src paths reports no missing local files.
- Could not run local HTTP server in this sandbox (permission denied on bind), so live browser/network page-load sweep was not possible here.
- Ran live Playwright runtime sweep after starting local HTTP server with approval:
  - `index.html`, `login.html`, `members.html`, `slots.html`, `roulette.html`, `blackjack.html`, `poker.html`, `ledger.html` returned HTTP 200 and no console/page/request errors.
  - Guard redirects occurred on protected pages; behavior was timing-sensitive before patch.
- Patched `js/guard.js` to enforce deterministic auth checks:
  - waits for `auth.authStateReady()` when available,
  - checks `auth.currentUser` immediately,
  - applies a timeout fallback redirect if auth state never resolves,
  - keeps logout redirect behavior.
- Refactored slots into modular 10-machine architecture:
  - New shared engine: `js/slots/slots-engine.js`
  - New machine config catalog: `js/slots/machines.js` (10 unique machines)
  - New page wiring: `js/slots/slots-page.js` (loads machine by `?m=`)
  - New slots page shell: `slots.html` (module-driven, no inline game logic)
  - New shared slots CSS: `css/slots/slots-base.css`
  - New machine themes: `css/slots/machines/machine-01.css` ... `machine-10.css`
  - Added slots lobby links in `members.html` to all 10 machines.
- Browser validation:
  - `slots.html?m=machine-01` and `slots.html?m=machine-10` load with no console/page errors.
  - Spin flow updates wallet via `VaultEngine.debit/credit`.
  - Machine card count in slots lobby = 10.

TODO / next agent:
- Run browser validation outside sandbox (or with allowed local port binding) to capture runtime console errors per page.
- Optionally migrate inline game scripts into js/games/* modules to reduce duplication further.
- Improved landing hero readability/responsiveness by adding structural padding + min-height in index hero-left.

Final slots production audit (2026-02-24):
- Executed Playwright runtime audit on local server (`slots.html`, `members.html`, `login.html`) with mocked Firebase modules for deterministic auth state.
- Machine loading:
  - `?m=machine-03` loads correct machine class + theme CSS.
  - Missing/invalid `?m` safely normalizes to `?m=machine-01`.
- Wallet:
  - Exactly one `VaultEngine.debit` call per spin.
  - `VaultEngine.credit` called at most once on winning spin.
  - Auto-spin halts on insufficient funds.
  - Mid-spin navigation away does not duplicate payout.
  - Reload preserves wallet balance.
- Visual/perf:
  - All 10 machine classes/themes resolve correctly.
  - Mobile viewport overflow = 0px for machine-01..machine-10.
  - No duplicate spin listener behavior detected after machine switch.
  - Console/page/runtime errors: none in audit run.
- Navigation/auth:
  - Members -> Slots machine -> back to Members works.
  - Slots logout redirects to login.
  - Logged-out guard redirects to login on slots page.
