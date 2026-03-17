<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-14 -->

# src/main/

## Purpose
The `main/` directory contains the Electron main process. It owns the application lifecycle: creating and positioning the transparent frameless widget window, setting up the system tray, registering all IPC handlers, polling usage data via `UsageTracker`, computing and broadcasting `PetState` to all renderer windows, managing the quote collection and badge system, generating share cards, and handling auto-update and auto-launch. This is the only layer that imports from the `electron` package.

## Key Files
| File | Description |
|------|-------------|
| `main.ts` | Application entry point — creates the `BrowserWindow`, starts `UsageTracker`, registers IPC, runs the `broadcastState()` loop (poll + 2-minute message rotation), and wires up the context menu |
| `ipc-handlers.ts` | Registers all `ipcMain.handle` / `ipcMain.on` listeners; owns the singleton `electron-store` instance (`getStore()`); exposes `setOnSettingsChanged()` callback |
| `preload.ts` | Context-bridge script that exposes `window.electronAPI` to the renderer; bridges all IPC channels defined in `shared/types.ts` |
| `settings-window.ts` | Creates and shows the secondary settings `BrowserWindow` (loads `index.html#settings`) |
| `tray.ts` | Creates the system tray icon with a context menu (show/hide, share card, settings, update check, quit) |
| `auto-launch.ts` | Wraps the `auto-launch` npm package; exports `syncAutoLaunch()` (called on startup) and `updateAutoLaunch()` (called on settings change) |
| `auto-updater.ts` | Initializes `electron-updater` with GitHub Releases; handles update-available dialog and silent download |
| `share-card.ts` | Generates a share-card image (PNG) from the current `PetState` using an off-screen `BrowserWindow` with a dedicated HTML template; copies result to clipboard |
| `skin-manager.ts` | Handles custom character skin uploads (file dialog → copy to app data dir), reset, and config persistence |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| *(none)* | — |

## For AI Agents

### Working In This Directory
- This is the **only** directory that may import from `electron`. Do not add Electron imports to `core/` or `shared/`.
- The main process is compiled by `tsconfig.main.json` (CommonJS, output to `dist/main/main/`). Restart Electron or run `npm run build:main` after changes.
- `broadcastState()` in `main.ts` is the central dispatch function: it re-computes mood, evaluates quote and badge triggers, updates daily history, and sends `PET_STATE_UPDATE` to all windows. All state mutations should flow through here.
- The widget window is **200×250 px**, transparent, frameless, `skipTaskbar: true`, always-on-top by default. It uses a hit-test pattern: the renderer sends `SET_IGNORE_MOUSE` IPC to toggle click-through based on cursor position over the character.
- Window position is persisted to `electron-store` as `windowPosition: { x, y }` and clamped to the nearest display's work area on every move.
- The `getStore()` singleton from `ipc-handlers.ts` is the single source of truth for persisted settings. Do not create additional `Store` instances.
- IPC channels: always use the `IPC_CHANNELS` constants from `shared/types.ts`; never hardcode channel name strings.
- On 401 from the API, the main process re-reads credentials and retries once (Claude Code may have refreshed the token in the background).

### Testing Requirements
- No automated tests exist for the main process. Test manually via `npm run dev`.
- When adding new IPC handlers, verify both the `ipcMain` side here and the `preload.ts` bridge and the renderer call site.
- Check that new `electron-store` keys have defaults defined in the `defaults` object in `ipc-handlers.ts`.

### Common Patterns
- IPC handler registration pattern: `ipcMain.handle(IPC_CHANNELS.FOO, async (_event, arg) => { ... })`.
- One-way events from main → renderer: `win.webContents.send(IPC_CHANNELS.FOO, payload)` iterated over `BrowserWindow.getAllWindows()` with `isDestroyed()` guard.
- Settings persistence: `store.set(key, value)` immediately; call `onSettingsChanged?.()` to re-broadcast state after locale or other display-affecting changes.
- Store access: always via `getStore()` — never import `Store` and construct a new instance.

## Dependencies
### Internal
- `../core/usage-tracker` — `UsageTracker`
- `../core/pet-state-engine` — `computePetState()`
- `../core/pet-messages` — `getMessage()`, `getCurrentCommonQuoteId()`
- `../core/contextual-messages` — `getContextualMessage()`
- `../core/quote-triggers` — `evaluateQuoteTriggers()`
- `../core/quote-collection` — `QuoteCollectionManager`
- `../core/badge-triggers` — `evaluateBadgeTriggers()`
- `../core/badge-manager` — `BadgeManager`
- `../shared/types` — `IPC_CHANNELS`, all type definitions
- `../shared/i18n` — `t()`, `DEFAULT_LOCALE`

### External
- `electron` — `app`, `BrowserWindow`, `ipcMain`, `screen`, `Menu`, `dialog`, `Tray`, `nativeImage`
- `electron-store` 8.2.0 — settings persistence
- `electron-updater` — auto-update
- `auto-launch` — system startup registration
- `@electron/notarize` (build-time only, via `scripts/notarize.js`)

<!-- MANUAL: -->
