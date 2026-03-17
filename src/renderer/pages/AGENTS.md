<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-14 -->

# src/renderer/pages/

## Purpose
Full-page React views rendered inside the settings `BrowserWindow` (loaded at `index.html#settings`). `Settings.tsx` is the root page with a two-tab layout (Settings | Collection). `Collection.tsx` is embedded inside Settings as a tab panel and contains its own sub-tabs (Quotes | Badges).

## Key Files
| File | Description |
|------|-------------|
| `Settings.tsx` | Settings page — manages locale selection, auto-start toggle, always-on-top toggle, character skin configuration (default / single / per-mood / spritesheet modes with file upload), current status readout, and API connection status. Calls `window.electronAPI.setSettings()` on save. Embeds `<Collection>` in the collection tab. |
| `Collection.tsx` | Collection page — displays quote unlock progress by rarity (common/rare/legendary/secret) and badge progress by tier (bronze/silver/gold). Renders the full `BADGE_REGISTRY` as a grid with locked/unlocked visual states. Provides a share button for non-common unlocked quotes. |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| *(none)* | — |

## For AI Agents

### Working In This Directory
- Both pages use a single inline style object (`const s: Record<string, React.CSSProperties>`) at the bottom of the file — follow this pattern for any new styles.
- All user-visible strings must use `t(locale, key)` — add new keys to `src/shared/i18n.ts` for all four locales simultaneously (ko, en, ja, zh).
- The settings window has a custom titlebar (`WebkitAppRegion: 'drag'`) with a close button (`WebkitAppRegion: 'no-drag'`). Do not replace this with a native frame.
- Skin upload flow: renderer calls `window.electronAPI.uploadSkin(mood?)` → main opens a file dialog and copies the file to the app data directory → returns the absolute file path → renderer updates `skinConfig` state and calls `saveSkinConfig()`. Never write to the filesystem from the renderer.
- `Collection.tsx` reads `QUOTE_REGISTRY` and `BADGE_REGISTRY` directly from `src/core/` to render the full catalog including locked entries (shown as `???`). Only unlocked IDs come from the main process via `window.electronAPI.getCollection()` and `getBadges()`.
- The `onCollectionUpdated` and `onBadgeUnlocked` IPC subscriptions in `Collection.tsx` must have their cleanup functions returned from `useEffect`.

### Testing Requirements
- No automated tests. Open the settings window via `npm run dev` and verify:
  - All four locale options switch the UI language.
  - Auto-start and always-on-top toggles persist after save.
  - Skin mode switching shows the correct upload UI.
  - Collection progress bars update when quotes/badges are unlocked.

### Common Patterns
- Locale-aware label helper: `const i = (key: UIStringKey) => t(locale, key)` defined at the top of each component.
- `UIStringKey` is the union of all keys in `UI_STRINGS.ko` (see `src/shared/i18n.ts`). TypeScript will catch missing keys at compile time.
- Tab active state pattern: `style={{ ...s.tab, ...(activeTab === 'settings' ? s.tabActive : {}) }}`.
- Rarity/tier color maps (`RARITY_COLORS`, `TIER_COLORS`) are defined locally in `Collection.tsx` and parallel the registry data.

## Dependencies
### Internal
- `../../shared/types` — `PetSettings`, `PetState`, `Locale`, `SkinConfig`, `SkinMode`, `CollectionState`, `BadgeState`, `QuoteRarity`, `BadgeTier`
- `../../shared/i18n` — `t()`, `LOCALE_LABELS`, `UIStringKey`, `DEFAULT_LOCALE`
- `../../core/quote-registry` — `QUOTE_REGISTRY`
- `../../core/badge-registry` — `BADGE_REGISTRY`

### External
- `react` ^19

<!-- MANUAL: -->
