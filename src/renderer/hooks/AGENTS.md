<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-14 -->

# src/renderer/hooks/

## Purpose
Custom React hooks that encapsulate renderer-side state management. `usePetState` subscribes to live IPC updates from the main process, while `useWidgetMode` manages the local toggle between the compact mini bar and the expanded dual-bar display. Both hooks are consumed by `App.tsx`.

## Key Files
| File | Description |
|------|-------------|
| `usePetState.ts` | Subscribes to `PET_STATE_UPDATE` IPC events via `window.electronAPI.onPetStateUpdate`. In development, exposes `window.setMood(expression)` and `window.resetMood()` console helpers. Returns `PetState | null`. |
| `useWidgetMode.ts` | Simple `useState` toggle between `'mini'` and `'expanded'` modes. Returns `{ mode, onToggle }`. The usage bar click handler calls `onToggle`. |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| *(none)* | — |

## For AI Agents

### Working In This Directory
- `usePetState` stores both the live state (via `setState`) and a ref to it (`realStateRef`) so that `window.setMood()` can overlay a debug state while preserving the real state for `window.resetMood()`.
- The IPC subscription cleanup function returned by `window.electronAPI.onPetStateUpdate` must be returned from `useEffect` to prevent listener leaks.
- `useWidgetMode` has no persistence — the mode resets to `'mini'` on every reload. This is intentional; the widget should not remember expansion state across restarts.
- The `window.setMood` debug helper is only registered when `process.env.NODE_ENV !== 'production'`. Do not add production code paths inside the dev-only block.

### Testing Requirements
- No automated tests. Verify `usePetState` by observing the widget update live during `npm run dev`.
- Verify the debug helper in the browser DevTools console: `setMood('angry')`, `setMood('proud')`, `resetMood()`.

### Common Patterns
- IPC subscription pattern:
  ```ts
  useEffect(() => {
    const cleanup = window.electronAPI.onSomeEvent((data) => { ... });
    return cleanup;
  }, []);
  ```
- Dev-only global helper registration:
  ```ts
  if (process.env.NODE_ENV !== 'production') {
    (window as any).myHelper = () => { ... };
  }
  ```

## Dependencies
### Internal
- `../../shared/types` — `PetState`, `PetMood`, `PetErrorExpression`, `Locale`
- `../../core/pet-messages` — `MESSAGE_POOLS` (debug helper only)

### External
- `react` ^19

<!-- MANUAL: -->
