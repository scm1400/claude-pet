<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-14 -->

# src/shared/

## Purpose
The `shared/` directory contains code consumed by both the Electron main process and the React renderer. It defines all cross-process type contracts (`types.ts`) and the internationalization system (`i18n.ts`). Nothing here may import from `electron`, Node built-ins, or the DOM — it must be valid in all three compilation targets: `tsconfig.main.json`, Vite renderer, and Vitest.

## Key Files
| File | Description |
|------|-------------|
| `types.ts` | All shared TypeScript types and interfaces: `PetMood`, `PetErrorExpression`, `PetState`, `PetSettings`, `Locale`, `QuoteRarity`, `QuoteEntry`, `UnlockedQuote`, `CollectionState`, `DailyUtilRecord`, `TriggerContext`, `ContextTrigger`, `BadgeTier`, `BadgeEntry`, `UnlockedBadge`, `BadgeState`, `BadgeTriggerContext`, `SkinMode`, `SkinConfig`. Also exports the `IPC_CHANNELS` constant object with all IPC channel name strings. |
| `i18n.ts` | `detectLocale()` (Electron app or `navigator.language` fallback), `DEFAULT_LOCALE` (module-level constant), `UI_STRINGS` (nested const object for ko/en/ja/zh), `UIStringKey` (derived union type), `t(locale, key)` translation function, `LOCALE_LABELS` display names. |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| *(none)* | — |

## For AI Agents

### Working In This Directory
- **No Electron imports.** `i18n.ts` has a `try/catch` around `require('electron')` specifically to handle the renderer context — do not remove it.
- `types.ts` is the single source of truth for the data contract between the main process and renderer. When adding a new IPC channel, add it to `IPC_CHANNELS` here first.
- `UIStringKey` is automatically derived as `keyof typeof UI_STRINGS.ko`. Adding a new key requires adding it to all four locale objects (ko, en, ja, zh) simultaneously — TypeScript will error if any locale is missing a key.
- `DEFAULT_LOCALE` is computed once at module load. In the main process this calls `app.getLocale()`; in the renderer it uses `navigator.language`. The result is cached for the lifetime of the process.
- `SkinConfig` supports four modes: `'default'` (no custom image), `'single'` (one image for all expressions), `'per-mood'` (separate image per `Expression`), `'spritesheet'` (atlas with `moodMap` grid coordinates). All modes except `'default'` store absolute file paths.

### Testing Requirements
- No direct tests for this directory. It is exercised by `src/core/__tests__/` (which imports types) and implicitly by the full build.
- Run `npm run build:main` and `npm run build:renderer` to verify there are no type errors.

### Common Patterns
- Adding a new IPC channel:
  1. Add to `IPC_CHANNELS` in `types.ts`.
  2. Add the handler in `src/main/ipc-handlers.ts` (or `main.ts`).
  3. Expose it in `src/main/preload.ts`.
  4. Add the TypeScript declaration in `src/renderer/electron.d.ts`.
- Adding a new UI string: add the key to all four locale objects in `UI_STRINGS` in `i18n.ts`, then use `t(locale, 'your_new_key')` in components.

## Dependencies
### Internal
- None (leaf node in the import graph)

### External
- None (pure TypeScript, no runtime dependencies)

<!-- MANUAL: -->
