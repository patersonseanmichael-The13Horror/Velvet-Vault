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

Feature add pass (2026-02-25):
- Added new additive files (no game logic rewrites):
  - css/dealer-voice.css
  - css/slots/vip-themes.css
  - js/dealer-voice.js
  - js/helper-bot.js
  - js/wallet-manual.js
  - js/casino-floor-animations.js
- Updated pages to load new modules/styles:
  - members.html
  - slots.html
  - roulette.html
  - blackjack.html
  - poker.html
- Replaced members helper/manual script tags with new additive modules to prevent duplicate listeners.
- Dealer voice notes:
  - Uses WebAudio fallback and arms only after user interaction.
  - File audio path support remains available but disabled by default (`localStorage.vv_enable_dealer_audio_files="1"` to enable).
- Playwright audit (mocked Firebase modules, mobile viewport 390x844):
  - Console errors: 0
  - Page errors: 0
  - Horizontal overflow: none across index/login/members/slots/roulette/blackjack/poker/ledger
  - One benign requestfailed on login run due immediate redirect to members aborting an image request.
- Follow-up fix: helper bot now forces visibility for pre-existing members helper mount (inline `display:none` compatibility).
- Final verification pass:
  - Console errors: 0
  - Page errors: 0
  - Mobile overflow violations: 0
  - Remaining request failures in audit were aborted external fonts/redirect artifacts only under mocked auth transitions.

Secure wallet + payout hardening (2026-02-25):
- Added Cloud Functions backend wallet authority (`functions/index.js`) with callable endpoints:
  - `walletGetState`
  - `walletDebit`
  - `walletCredit`
  - `walletVoidRound`
- Added idempotency layer in Firestore (`users/{uid}/idempotency/{key}`) so repeated calls return prior result.
- Added round settlement model (`users/{uid}/rounds/{roundId}`):
  - `OPEN` on debit
  - `SETTLED` on credit
  - duplicate credit blocked for same round
- Added secure rules:
  - `firestore.rules` denies client writes to wallet/ledger/round/idempotency docs
  - allows client create/read of own manual upload requests only under `users/{uid}/manual_uploads/{requestId}`
  - `storage.rules` restricts uploads to `manual-uploads/{uid}/...` and image MIME with auth
- Replaced client wallet engine with secure wrapper (`js/wallet-secure.js`) while preserving `window.VaultEngine` API used by games.
- `js/wallet.js` is now a thin module wrapper importing `wallet-secure.js`.
- Added secure manual upload script (`js/manual-upload.js`) using Firebase Storage + Firestore with uid-scoped path and request docs.
- Updated `js/firebase-init.js` to expose `window.vvApp` for secure wallet/storage/firestore clients.
- Updated `members.html` to load `js/manual-upload.js` (module).

Firestore schema (brief):
- `users/{uid}`:
  - `uid`, `name`, `tier`, `balance`, `createdAt`, `updatedAt`
- `users/{uid}/ledger/{entryId}`:
  - `ts`, `type` (`debit|credit`), `amount`, `note`, `game`, `roundId`, `balanceAfter`, `idempotencyKey`
- `users/{uid}/rounds/{roundId}`:
  - `uid`, `roundId`, `game`, `note`, `status` (`OPEN|SETTLED|VOID`), `wager`, `payout`, `createdAt`, `updatedAt`, `settledAt?`, `voidReason?`
- `users/{uid}/idempotency/{idempotencyKey}`:
  - `uid`, `createdAt`, `result`
- `users/{uid}/manual_uploads/{requestId}`:
  - `uid`, `requestId`, `status`, `createdAt`, `storagePath`, `downloadURL`, `screenshotName`, `screenshotSize`, metadata fields
- Upload path policy aligned to requirement: `uploads/{uid}/...` (Storage rule + Firestore storagePath validator + client upload path).

## Security Patch — Server Authoritative Wallet (Velvet Vault)

### Source of truth
- Firestore: `users/{uid}.balance` is authoritative.
- Client localStorage is cache only (UI fallback).

### Ledger
- `users/{uid}/ledger/{entryId}` entries created server-side:
  - `{ type: "debit"|"credit", amount, game, roundId, createdAt }`

### Idempotency
- `payoutLocks/{uid_roundId}` prevents double payout for the same roundId.
- `debitLocks/{uid_roundId}` prevents repeated debit if same roundId is replayed.

### Manual review
- Upload: Storage `uploads/{uid}/...` (images only, <=5MB)
- Request: Firestore `manualReviews/{docId}` written server-side via callable `vvCreateManualReview`.

### Client API compatibility
Games still call:
- `window.VaultEngine.getBalance()`
- `window.VaultEngine.debit(amount, note)`
- `window.VaultEngine.credit(amount, note)`
- `window.VaultEngine.subscribe(fn)`

Under the hood, `debit/credit` call Cloud Functions and balance updates via Firestore snapshots.

Secure wallet schema + implementation notes (2026-02-24):
- Server authority:
  - `functions/index.js` now exposes callable endpoints `walletGetState`, `walletDebit`, `walletCredit`, `walletVoidRound`, and `vvCreateManualReview`.
  - Firestore `users/{uid}.balance` is authoritative; client localStorage is cache-only.
- Round + idempotency model:
  - Debit creates `users/{uid}/rounds/{roundId}` with status `OPEN` and wager amount.
  - Credit requires `roundId`; transaction settles `OPEN -> SETTLED` once.
  - Duplicate payout attempts for same `roundId` return `alreadyPaid: true` via `users/{uid}/idempotency/payout_{roundId}`.
- Wallet API compatibility:
  - Preserved `window.VaultEngine` API used by games: `getBalance`, `debit`, `credit`, `subscribe`, `formatGold`.
  - Added `getLedger` compatibility for ledger page rendering (cache-backed, no client write authority).
  - `credit()` now refuses calls that do not have a prior debited round id (prevents direct console minting path).
- Manual upload hardening:
  - Client uploads to Firebase Storage path `uploads/{uid}/...` only.
  - Callable writes metadata to `users/{uid}/manual_uploads/{requestId}`.
  - `storage.rules` and `firestore.rules` deny cross-user and all direct client writes for wallet/ledger/round/idempotency collections.
## Security Patch — Server Authoritative Wallet (Velvet Vault)

### Source of truth
- Firestore: `users/{uid}.balance` is authoritative.
- Client localStorage is cache only (UI fallback).

### Ledger
- `users/{uid}/ledger/{entryId}` entries created server-side:
  - `{ type: "debit"|"credit", amount, game, roundId, createdAt }`

### Idempotency
- `payoutLocks/{uid_roundId}` prevents double payout for the same roundId.
- `debitLocks/{uid_roundId}` prevents repeated debit if same roundId is replayed.

### Manual review
- Upload: Storage `uploads/{uid}/...` (images only, <=5MB)
- Request: Firestore `manualReviews/{docId}` written server-side via callable `vvCreateManualReview`.

### Client API compatibility
Games still call:
- `window.VaultEngine.getBalance()`
- `window.VaultEngine.debit(amount, note)`
- `window.VaultEngine.credit(amount, note)`
- `window.VaultEngine.subscribe(fn)`

Under the hood, `debit/credit` call Cloud Functions and balance updates via Firestore snapshots.
