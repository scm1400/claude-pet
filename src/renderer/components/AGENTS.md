<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-14 -->

# src/renderer/components/

## Purpose
Reusable UI components for the widget view. Each component is self-contained, receives all data via props, and uses inline `CSSProperties` styles. There are no CSS modules or external UI libraries — styling is done entirely in-component to keep the transparent widget rendering predictable across Windows and macOS.

## Key Files
| File | Description |
|------|-------------|
| `Character.tsx` | Renders the pixel-art mascot with mood-specific CSS animations (`MOOD_ANIMATIONS`), aura glow effects (`MOOD_AURA`), and per-mood particle overlays (`MoodOverlay`). Supports four skin modes: default, single image, per-mood images, and spritesheet (with `objectPosition` crop). Forwarded ref enables hit-testing in `App.tsx`. |
| `SpeechBubble.tsx` | Animated speech bubble with typewriter text effect (Unicode code-point aware for Korean), mood-specific border/background styles, configurable tail direction (`up`/`down`), and auto-dismiss after 5 seconds (400ms fade-out). |
| `UsageIndicator.tsx` | Four exported components: `WeeklyBar` (7-day panel), `FiveHourBar` (5-hour panel with red warning at >90%), `MiniBar` (compact single-line bar for mini mode), `OfflineLabel` (shown when `dataSource === 'none'`). All panels include a live countdown timer to the reset timestamp. |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| *(none)* | — |

## For AI Agents

### Working In This Directory
- `Character.tsx` uses `forwardRef` — the ref must remain on the outer hit-area `div` so `App.tsx` can use `getBoundingClientRect()` for mouse hit-testing.
- `MoodOverlay` is an internal component (not exported) that renders CSS-animated particles (steam puffs, rain drops, hearts, sparkles, Zzz) as absolutely-positioned divs. The animations are defined in `src/renderer/styles/styles.css`.
- The character image dimensions are fixed at `IMG_W = 60, IMG_H = 60` inside an `HIT_AREA = 80` px invisible hit zone.
- Spritesheet support in `Character.tsx`: `objectFit: 'none'` + `objectPosition` crops the correct frame. Frame dimensions are pre-calculated at upload time and stored in `SkinConfig.spritesheet.frameWidth/frameHeight`.
- `SpeechBubble.tsx` spreads the message into Unicode code points with `[...str]` — do not change to `.split('')` or Korean characters will break.
- `useCountdown` in `UsageIndicator.tsx` updates every 30 seconds. Do not increase the interval — the tray countdown should stay reasonably accurate.

### Testing Requirements
- No automated tests. Test manually by running `npm run dev` and using `window.setMood('angry')` etc. in the browser console.
- Verify all six expressions in `Character.tsx`: angry, worried, happy, proud, confused, sleeping.
- Verify the speech bubble tail direction flips when the window is near the top of the screen (`window.screenY < 120`).

### Common Patterns
- Mood-keyed record lookup: `MOOD_ANIMATIONS[expression]`, `MOOD_COLORS[mood]` — add new expressions to all relevant records simultaneously.
- Inline style composition: `{ ...baseStyle, ...(condition ? conditionalStyle : {}) }`.
- All animation keyframe names referenced here must be defined in `src/renderer/styles/styles.css`.

## Dependencies
### Internal
- `../../shared/types` — `PetMood`, `PetErrorExpression`, `SkinConfig`, `Locale`
- `../../shared/i18n` — `t()`, `DEFAULT_LOCALE`
- `../assets/claude-pet.png` — default character sprite (bundled by Vite)

### External
- `react` ^19

<!-- MANUAL: -->
