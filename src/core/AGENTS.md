<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-14 -->

# src/core/

## Purpose
The `core/` directory contains all pure business logic for Claude Pet. None of the files here import from Electron or the DOM — they depend only on Node built-ins (for `usage-tracker.ts`) and `src/shared/`. This isolation allows the mood engine, message selection, quote collection, badge system, and contextual messages to be tested fully in a plain Node/vitest environment without launching Electron.

## Key Files
| File | Description |
|------|-------------|
| `pet-state-engine.ts` | Pure function `computePetState(input)` that maps usage percentages and error states to a `PetState` object including mood and message |
| `usage-tracker.ts` | `UsageTracker` class that polls the Anthropic OAuth usage API every 5 minutes, falls back to JSONL session file parsing on 429, and reads credentials from file/keychain/secret-tool |
| `pet-messages.ts` | `MESSAGE_POOLS` map (locale → mood → string[]) and `getMessage()` with round-robin rotation; exposes `getCurrentCommonQuoteId()` for collection tracking |
| `contextual-messages.ts` | `getContextualMessage()` that overrides the normal mood message with situation-specific variants (weekend, unused streak, spike, reset-imminent) based on `TriggerContext` |
| `quote-registry.ts` | Static `QUOTE_REGISTRY` array of all `QuoteEntry` objects with rarity, IDs, and per-locale text |
| `quote-triggers.ts` | `evaluateQuoteTriggers(ctx, currentCommonId)` — evaluates which quote IDs should be unlocked given the current `TriggerContext` |
| `quote-collection.ts` | `QuoteCollectionManager` class — tracks unlocked quotes, persists/restores from plain objects, provides `getState()` for renderer consumption |
| `badge-registry.ts` | Static `BADGE_REGISTRY` array of all `BadgeEntry` objects with tier, icons, and per-locale names/descriptions |
| `badge-triggers.ts` | `evaluateBadgeTriggers(ctx)` — evaluates which badge IDs should be awarded given the current `BadgeTriggerContext` |
| `badge-manager.ts` | `BadgeManager` class — parallel to `QuoteCollectionManager`, tracks unlocked badges |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `__tests__/` | Vitest unit tests for core logic |

## For AI Agents

### Working In This Directory
- Do not import `electron`, `BrowserWindow`, or any Electron API here. The entire layer must run in a plain Node.js process.
- `usage-tracker.ts` uses `https`, `fs`, `os`, `path`, and `child_process` — standard Node built-ins only.
- `computePetState()` in `pet-state-engine.ts` is a pure function: given the same input it always returns the same output. Keep it that way — no global state, no timers.
- Mood thresholds: `<15%` = angry, `15–50%` = worried, `50–85%` = happy, `≥85%` = proud. The 5-hour window overrides the message (but not the mood) when `fiveHourUtilization > 90`.
- `UsageTracker` uses exponential backoff (levels 0–2, capped at 15 min) on errors, a fixed 2-minute retry on 429, and ±15% jitter on all intervals.
- The JSONL fallback in `UsageTracker` reads `~/.claude/projects/**/*.jsonl`, applies weighted token cost (input × 1, output × 1, cache_creation × 0.25, cache_read × 0.1), and uses a persisted calibration file (`~/.claude/mama-calibration.json`) to convert tokens to utilization percent.
- On macOS, credential reading tries the credentials file first, then `security find-generic-password` directly, then an osascript wrapper (for packaged-app keychain access). The osascript result is persisted back to the file to avoid repeated keychain dialogs.

### Testing Requirements
- All business logic changes in this directory must be accompanied by tests in `__tests__/`.
- Run `npm test` (vitest) from the repo root.
- Tests should use pure inputs — no mocking of `fs` or `https` unless unavoidable.
- Test files follow the naming convention `{module}.test.ts`.

### Common Patterns
- Trigger evaluator functions (`evaluateQuoteTriggers`, `evaluateBadgeTriggers`) return arrays of string IDs; the manager classes handle deduplication and persistence.
- Registry arrays (`QUOTE_REGISTRY`, `BADGE_REGISTRY`) are the single source of truth for what exists; `totalCount` in state is derived from registry length.
- Manager classes expose `processTriggered(ids, now)` → newly-unlocked entries, `serialize()` → plain objects for `electron-store`, and `getState()` → renderer-consumable state.

## Dependencies
### Internal
- `../shared/types` — all shared type definitions
- `../shared/i18n` — `DEFAULT_LOCALE`, `t()`

### External
- Node built-ins: `https`, `fs`, `os`, `path`, `child_process`

<!-- MANUAL: -->
