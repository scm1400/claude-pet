<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-14 -->

# src/core/__tests__/

## Purpose
Unit tests for the core business logic layer, executed by Vitest. Each test file targets one module in `src/core/` and verifies behavior using pure data inputs — no Electron environment, no network calls, no filesystem access is required.

## Key Files
| File | Description |
|------|-------------|
| `pet-state-engine.test.ts` | Tests for `computePetState()`: covers all mood thresholds, error states (NO_CREDENTIALS, 429 rate-limited, API error), 5-hour override, and rate-limited + JSONL-data combinations |
| `quote-triggers.test.ts` | Tests for `evaluateQuoteTriggers()`: verifies that the correct quote IDs are returned for various `TriggerContext` scenarios |
| `badge-triggers.test.ts` | Tests for `evaluateBadgeTriggers()`: verifies badge award conditions including streak, proud/angry counts, and timing criteria |
| `quote-collection.test.ts` | Tests for `QuoteCollectionManager`: serialization, deserialization, deduplication of unlocked quotes, and `getState()` output shape |
| `contextual-messages.test.ts` | Tests for `getContextualMessage()`: verifies that weekend, unusedStreak, spike, and resetImminent triggers produce the expected contextual overrides |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| *(none)* | — |

## For AI Agents

### Working In This Directory
- Test files must import only from `../../core/` and `../../shared/` — no Electron imports.
- Use the naming convention `{module-name}.test.ts` matching the source file name.
- Keep tests deterministic: fix the `now` date and `installDate` when constructing `TriggerContext` objects.
- Do not add snapshot tests; prefer explicit assertions on return values.

### Testing Requirements
- Run: `npm test` from the repo root (executes `vitest run`).
- All tests must pass before merging any changes to `src/core/`.
- When adding a new trigger or registry entry, add at least one positive and one negative test case.

### Common Patterns
- `TriggerContext` construction pattern used across test files:
  ```ts
  const ctx: TriggerContext = {
    weeklyUtilization: 75,
    fiveHourUtilization: null,
    dailyHistory: [],
    installDate: new Date('2025-01-01').toISOString(),
    firstApiCallSeen: true,
    now: new Date('2025-06-15T12:00:00Z'),
    resetsAt: null,
  };
  ```
- Badge trigger tests extend this with `proudCount` and `angryCount`.
- `QuoteCollectionManager` is constructed with an array of `{ id: string; unlockedAt: string }` objects mirroring `electron-store` persistence.

## Dependencies
### Internal
- `../../core/pet-state-engine`, `../../core/quote-triggers`, `../../core/badge-triggers`, `../../core/quote-collection`, `../../core/contextual-messages`
- `../../shared/types`

### External
- `vitest` (test runner, configured via `vitest.config.ts` at repo root)

<!-- MANUAL: -->
