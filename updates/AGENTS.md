# AGENTS.md — Kasir Kedai Kopi

## Stack
- React 18 (JSX, no TS) + Vite 5 + Electron 31 + electron-builder (NSIS)
- All UI in Indonesian

## Dev commands
| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server (browser-only, no Electron) |
| `npm run build` | Vite build to `dist/` |
| `npm run electron:dev` | Vite + Electron concurrently via `concurrently` + `wait-on` |
| `npm run electron:build` | `vite build && electron-builder --win`, output in `release/` |
| `npm install --legacy-peer-deps` | Always use this flag on install |

## Architecture
- **`electron/main.js`** — IPC handlers, file persistence (JSON in `%APPDATA%/kasir-warung-nusantara/data/`), WAL crash recovery, daily backups (30-day retention), print service, license check
- **`electron/preload.js`** — Exposes `window.kasirAPI` via contextBridge (all IPC calls)
- **`src/App.jsx`** — Single coordinator; all 8 hooks wired here, no hook imports another hook
- **`src/hooks/`** — 8 domain hooks: `useAuth`, `useBills`, `useCart`, `useHistory`, `useLicense`, `useMenu`, `useSettings`, `useToast`
- **`src/views/`** — 5 views: `ViewKasir`, `ViewOpenBill`, `ViewRiwayat`, `ViewLaporan`, `ViewKelola`
- **`src/utilities/utils.js`** — `api` object: works in both Electron (`window.kasirAPI`) and browser (falls back to `localStorage` with `ykk_*` keys)
- **`src/utilities/users.js`** — Default user: `admin` / `admin123`

## Key quirks
- `vite.config.js` **must** have `base: "./"` for Electron path resolution
- License gating: app shows activation screen until valid license key entered. `generator.js` (seller-only, not distributed) generates keys matching `electron/main.js` logic using shared `LICENSE_SECRET`
- Critical atomic IPC: `process-payment` — writes trx + updates menu stock + removes open bill in one WAL-protected operation. Always use `process-payment` instead of separate `trx-save` + `menu-save`
- Shift-based workflow: user must login to start a shift; closing a shift clears all open bills (no undo — known behavior)
- `buildReceiptHTML` and `buildPreviewHTML` in `src/utilities/receipt.js` for thermal printer formatting

## What's NOT configured
- No tests, no linting, no typechecking, no formatter
- No CI/CD
