<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-14 -->

# src/renderer/

## Purpose
The `renderer/` directory is the React 19 frontend for the Electron renderer process. It renders the transparent widget (character, speech bubble, usage bars) and the settings window as a single Vite-bundled SPA. Page routing is hash-based (`#settings` → Settings page, default → main widget). The renderer communicates with the main process exclusively through `window.electronAPI`, the context-bridge object exposed by `preload.ts`.

## Key Files
| File | Description |
|------|-------------|
| `main.tsx` | React entry point — mounts `<App />` into `#root` |
| `App.tsx` | Root component — reads `window.location.hash` to route between `<MainView>` (widget) and `<Settings>`; `MainView` owns drag logic, hit-test mouse switching, speech bubble lifecycle, and layout |
| `index.html` | HTML shell for the Vite build |
| `electron.d.ts` | TypeScript declaration for `window.electronAPI` — must be kept in sync with `preload.ts` |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `components/` | Reusable UI components: Character, SpeechBubble, UsageIndicator |
| `hooks/` | Custom React hooks: usePetState, useWidgetMode |
| `pages/` | Full-page views: Settings, Collection |
| `styles/` | Global CSS animations |
| `assets/` | Static assets bundled by Vite (character sprite PNG) |
| `share-card-template/` | HTML template rendered off-screen for share card image generation |

## For AI Agents

### Working In This Directory
- The renderer runs in a **context-isolated** Electron renderer process. `window.electronAPI` is the only bridge to the main process. Never use `require` or direct Node/Electron imports here.
- Hash-based routing: `App.tsx` switches on `window.location.hash`. To add a new page, add a hash check and a new component in `pages/`.
- The widget window is **200×250 px**. Keep all layout within these bounds; avoid fixed pixel sizes that assume a larger viewport.
- Drag-to-move is implemented in `App.tsx` using `screen{X,Y}` + `window.electronAPI.moveWindow()`. The character's `ref` is used for hit-testing mouse position.
- The renderer has no access to the filesystem or Node APIs. Skin image paths are `file://` URIs received from the main process.
- All user-facing strings must go through `t(locale, key)` from `src/shared/i18n.ts` — no hardcoded English strings in JSX.
- In development mode, `usePetState` exposes `window.setMood(moodName)` and `window.resetMood()` helpers in the browser console.

### Testing Requirements
- No automated tests exist for the renderer. Test visually via `npm run dev`.
- Verify all moods display correctly: angry, worried, happy, proud, confused, sleeping.
- Verify both mini and expanded usage bar modes (click the bar to toggle).
- Verify the speech bubble triggers on message change and auto-dismisses.

### Common Patterns
- Receiving live state: `window.electronAPI.onPetStateUpdate(callback)` returns an unsubscribe function; always return it from `useEffect`.
- One-time state fetch: `window.electronAPI.getPetState()`, `window.electronAPI.getSettings()`, `window.electronAPI.getSkinConfig()`.
- Inline styles with `CSSProperties` typed objects rather than CSS modules (see `pages/Settings.tsx` for the `s` style object pattern).
- Conditional animation: pass the current `expression` string to look up from `MOOD_ANIMATIONS` or `MOOD_AURA` record maps in `Character.tsx`.

## Dependencies
### Internal
- `../shared/types` — all shared types and `IPC_CHANNELS`
- `../shared/i18n` — `t()`, `DEFAULT_LOCALE`, `LOCALE_LABELS`
- `../core/pet-messages` — `MESSAGE_POOLS` (used by `usePetState` debug helper)
- `../core/quote-registry` — `QUOTE_REGISTRY` (rendered in Collection page)
- `../core/badge-registry` — `BADGE_REGISTRY` (rendered in Collection page)

### External
- `react` ^19, `react-dom` ^19
- `vite` ^7 (build), `@vitejs/plugin-react` (JSX transform)

<!-- MANUAL: -->
