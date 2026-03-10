# Viral Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two viral features — Share Card (generates shareable PNG from current mama state) and Quote Collection (rarity-tiered collectible quotes with dogam UI).

**Architecture:** Pure core logic (quote-triggers, quote-collection) stays Electron-free and testable. Share card rendering lives in Electron main process using offscreen BrowserWindow. Collection UI is a new tab in the existing Settings window via hash routing.

**Tech Stack:** Electron 40, React 19, TypeScript, electron-store, vitest, HTML/CSS card template

**Spec:** `docs/superpowers/specs/2026-03-10-viral-features-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/shared/types.ts` | New types: `QuoteRarity`, `QuoteEntry`, `CollectionState`, new IPC channels |
| `src/shared/i18n.ts` | New UI strings for collection tab, tray menu labels |
| `src/core/quote-registry.ts` | **New** — Quote definitions with IDs, rarity, trigger conditions, i18n messages |
| `src/core/quote-triggers.ts` | **New** — `evaluateQuoteTriggers()` pure function |
| `src/core/quote-collection.ts` | **New** — Collection state management (unlock, query, serialize) |
| `src/core/__tests__/quote-triggers.test.ts` | **New** — Trigger boundary tests |
| `src/core/__tests__/quote-collection.test.ts` | **New** — Collection logic tests |
| `src/main/ipc-handlers.ts` | New IPC handlers for collection + share card |
| `src/main/preload.ts` | New API methods exposed to renderer |
| `src/main/share-card.ts` | **New** — Offscreen rendering + clipboard copy |
| `src/main/tray.ts` | Add "Share Report Card" menu item |
| `src/main/main.ts` | Wire trigger evaluation + collection into broadcastState |
| `src/renderer/share-card-template/card.html` | **New** — HTML/CSS template for card |
| `src/renderer/pages/Collection.tsx` | **New** — Dogam UI component |
| `src/renderer/pages/Settings.tsx` | Add tab navigation (Settings / Collection) |
| `src/renderer/App.tsx` | Add `#collection` hash route |

---

## Chunk 1: Types, Registry, and Quote Triggers

### Task 1: Add shared types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add new types to types.ts**

Add after the existing `MamaSettings` interface:

```typescript
/** Quote rarity tiers */
export type QuoteRarity = 'common' | 'rare' | 'legendary' | 'secret';

/** A single quote entry in the registry */
export interface QuoteEntry {
  id: string;
  rarity: QuoteRarity;
  messages: Record<Locale, string>;
  /** For common quotes: which mood pool and index this maps to */
  moodSource?: { mood: string; index: number };
}

/** Persisted unlock record */
export interface UnlockedQuote {
  id: string;
  unlockedAt: string; // ISO timestamp
}

/** Full collection state sent to renderer */
export interface CollectionState {
  unlocked: UnlockedQuote[];
  totalCount: number;
  byRarity: Record<QuoteRarity, { unlocked: number; total: number }>;
}

/** Historical daily utilization for trigger evaluation */
export interface DailyUtilRecord {
  date: string; // YYYY-MM-DD
  percent: number;
}

/** Input for trigger evaluation */
export interface TriggerContext {
  weeklyUtilization: number | null;
  fiveHourUtilization: number | null;
  dailyHistory: DailyUtilRecord[];
  installDate: string; // ISO
  firstApiCallSeen: boolean;
  now: Date;
}
```

Add new IPC channels to the `IPC_CHANNELS` const:

```typescript
export const IPC_CHANNELS = {
  MAMA_STATE_UPDATE: 'mama:state-update',
  MAMA_STATE_GET: 'mama:state-get',
  SETTINGS_GET: 'mama:settings-get',
  SETTINGS_SET: 'mama:settings-set',
  SHOW_SETTINGS: 'mama:show-settings',
  COLLECTION_GET: 'mama:collection-get',
  COLLECTION_UPDATED: 'mama:collection-updated',
  SHARE_CARD: 'mama:share-card',
} as const;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(types): add QuoteRarity, CollectionState, TriggerContext types and new IPC channels"
```

---

### Task 2: Create quote registry

**Files:**
- Create: `src/core/quote-registry.ts`

- [ ] **Step 1: Create the quote registry with all rarity tiers**

This file defines every collectible quote with its ID, rarity, trigger info, and i18n messages. Common quotes reference existing message pool entries. Rare/Legendary/Secret have unique messages.

```typescript
import { QuoteEntry, Locale } from '../shared/types';
import { MESSAGE_POOLS } from './messages';

type MoodKey = keyof typeof MESSAGE_POOLS.ko;

/** Generate common quote entries from existing message pools */
function generateCommonQuotes(): QuoteEntry[] {
  const moods: MoodKey[] = ['angry', 'worried', 'happy', 'proud', 'confused', 'sleeping', 'fiveHourWarning'];
  const entries: QuoteEntry[] = [];

  for (const mood of moods) {
    const pool = MESSAGE_POOLS.ko[mood];
    for (let i = 0; i < pool.length; i++) {
      const messages: Record<Locale, string> = {
        ko: MESSAGE_POOLS.ko[mood][i],
        en: MESSAGE_POOLS.en[mood][i],
        ja: MESSAGE_POOLS.ja[mood][i],
        zh: MESSAGE_POOLS.zh[mood][i],
      };
      entries.push({
        id: `common_${mood}_${i}`,
        rarity: 'common',
        messages,
        moodSource: { mood, index: i },
      });
    }
  }
  return entries;
}

const RARE_QUOTES: QuoteEntry[] = [
  {
    id: 'rare_exact0',
    rarity: 'rare',
    messages: {
      ko: '한 번도 안 쓴 거야? 비싼 돈 내고?',
      en: "You haven't used it at ALL? After paying good money?",
      ja: '一度も使ってないの？高いお金払ってるのに？',
      zh: '一次都没用过？花了那么多钱？',
    },
  },
  {
    id: 'rare_5h_100',
    rarity: 'rare',
    messages: {
      ko: '쉬어!! 손목 부러진다!!',
      en: 'STOP!! Your wrists are going to break!!',
      ja: '休んで！！手首が折れるわよ！！',
      zh: '休息！！手腕要断了！！',
    },
  },
  {
    id: 'rare_spike',
    rarity: 'rare',
    messages: {
      ko: '갑자기 열심히 하니까 더 무섭다',
      en: "You suddenly working hard is even scarier",
      ja: '急に頑張り出すと余計怖いわ',
      zh: '突然这么努力反而更可怕了',
    },
  },
  {
    id: 'rare_exact50',
    rarity: 'rare',
    messages: {
      ko: '딱 반이네... 반만 하는 게 어딨어',
      en: "Exactly half... who does things halfway?",
      ja: 'ちょうど半分ね... 中途半端はダメよ',
      zh: '刚好一半...做事哪有做一半的',
    },
  },
  {
    id: 'rare_night_owl',
    rarity: 'rare',
    messages: {
      ko: '이 시간에 아직도 코딩하냐?! 잠 좀 자!!',
      en: "Still coding at this hour?! Go to sleep!!",
      ja: 'こんな時間にまだコーディング？！寝なさい！！',
      zh: '这个点还在写代码？！快去睡觉！！',
    },
  },
];

const LEGENDARY_QUOTES: QuoteEntry[] = [
  {
    id: 'legendary_7day_streak',
    rarity: 'legendary',
    messages: {
      ko: '우리 아들이 달라졌어... (눈물)',
      en: 'My kid has changed... (tears)',
      ja: 'うちの子が変わった... (涙)',
      zh: '我家孩子变了... (泪)',
    },
  },
  {
    id: 'legendary_first_call',
    rarity: 'legendary',
    messages: {
      ko: '첫 걸음마 뗐구나~ 엄마가 봤어',
      en: "Your first steps~ Mom saw it all",
      ja: '初めての一歩ね〜ママ見てたわよ',
      zh: '迈出第一步了~ 妈妈都看到了',
    },
  },
  {
    id: 'legendary_99plus',
    rarity: 'legendary',
    messages: {
      ko: '엄마가 아들 잘못 봤다... 진짜 대단하다',
      en: "Mom was wrong about you... you're truly amazing",
      ja: 'ママ、あなたのこと見くびってた... 本当にすごいわ',
      zh: '妈妈看错你了... 真的很了不起',
    },
  },
];

const SECRET_QUOTES: QuoteEntry[] = [
  {
    id: 'secret_newyear',
    rarity: 'secret',
    messages: {
      ko: '명절에도 코딩하냐... 세뱃돈이나 받아라',
      en: "Coding on a holiday... at least take your lucky money",
      ja: 'お正月にもコーディング... お年玉でももらいなさい',
      zh: '过年还在写代码... 拿压岁钱去吧',
    },
  },
  {
    id: 'secret_chuseok',
    rarity: 'secret',
    messages: {
      ko: '추석에도 코딩이야? 송편이나 먹어!',
      en: "Coding on Chuseok? Go eat some songpyeon!",
      ja: '秋夕にもコーディング？ソンピョンでも食べなさい！',
      zh: '中秋还在写代码？去吃月饼吧！',
    },
  },
  {
    id: 'secret_christmas',
    rarity: 'secret',
    messages: {
      ko: '산타 말고 엄마가 치킨 시켜줄게',
      en: "Forget Santa — Mom will order you chicken",
      ja: 'サンタじゃなくてママがチキン頼んであげる',
      zh: '别等圣诞老人了，妈妈给你点炸鸡',
    },
  },
  {
    id: 'secret_100days',
    rarity: 'secret',
    messages: {
      ko: '벌써 100일... 엄마랑 동거 100일째네',
      en: "Already 100 days... living with Mom for 100 days~",
      ja: 'もう100日... ママとの同居100日目ね',
      zh: '已经100天了... 和妈妈同居100天了呢',
    },
  },
  {
    id: 'secret_3am',
    rarity: 'secret',
    messages: {
      ko: '이 시간에 아직도?! 엄마도 못 자잖아',
      en: "STILL up at this hour?! Mom can't sleep either!",
      ja: 'この時間にまだ？！ママも寝れないじゃない',
      zh: '这个点还没睡？！妈妈也睡不着了',
    },
  },
];

/** All quotes in the registry */
export const QUOTE_REGISTRY: QuoteEntry[] = [
  ...generateCommonQuotes(),
  ...RARE_QUOTES,
  ...LEGENDARY_QUOTES,
  ...SECRET_QUOTES,
];

/** Lookup a quote by ID */
export function getQuoteById(id: string): QuoteEntry | undefined {
  return QUOTE_REGISTRY.find((q) => q.id === id);
}

/** Get all quotes of a specific rarity */
export function getQuotesByRarity(rarity: QuoteEntry['rarity']): QuoteEntry[] {
  return QUOTE_REGISTRY.filter((q) => q.rarity === rarity);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/core/quote-registry.ts
git commit -m "feat(core): add quote registry with common/rare/legendary/secret entries"
```

---

### Task 3: Create quote triggers (TDD)

**Files:**
- Create: `src/core/quote-triggers.ts`
- Create: `src/core/__tests__/quote-triggers.test.ts`

- [ ] **Step 1: Write failing tests for trigger evaluation**

```typescript
// src/core/__tests__/quote-triggers.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateQuoteTriggers } from '../quote-triggers';
import { TriggerContext } from '../../shared/types';

function makeCtx(overrides: Partial<TriggerContext> = {}): TriggerContext {
  return {
    weeklyUtilization: 50,
    fiveHourUtilization: 50,
    dailyHistory: [],
    installDate: '2026-01-01T00:00:00Z',
    firstApiCallSeen: true,
    now: new Date('2026-03-10T12:00:00'),
    ...overrides,
  };
}

describe('evaluateQuoteTriggers', () => {
  describe('common quote tracking', () => {
    it('returns the common quote ID matching current mood message', () => {
      const ids = evaluateQuoteTriggers(makeCtx(), 'common_happy_0');
      expect(ids).toContain('common_happy_0');
    });
  });

  describe('rare triggers', () => {
    it('triggers rare_exact0 when weekly utilization is 0', () => {
      const ids = evaluateQuoteTriggers(makeCtx({ weeklyUtilization: 0 }));
      expect(ids).toContain('rare_exact0');
    });

    it('does NOT trigger rare_exact0 when weekly > 0', () => {
      const ids = evaluateQuoteTriggers(makeCtx({ weeklyUtilization: 1 }));
      expect(ids).not.toContain('rare_exact0');
    });

    it('triggers rare_5h_100 when 5h utilization is 100', () => {
      const ids = evaluateQuoteTriggers(makeCtx({ fiveHourUtilization: 100 }));
      expect(ids).toContain('rare_5h_100');
    });

    it('does NOT trigger rare_5h_100 when 5h < 100', () => {
      const ids = evaluateQuoteTriggers(makeCtx({ fiveHourUtilization: 99 }));
      expect(ids).not.toContain('rare_5h_100');
    });

    it('triggers rare_exact50 when weekly is exactly 50', () => {
      const ids = evaluateQuoteTriggers(makeCtx({ weeklyUtilization: 50 }));
      expect(ids).toContain('rare_exact50');
    });

    it('triggers rare_spike when daily history shows +30% jump', () => {
      const ids = evaluateQuoteTriggers(makeCtx({
        weeklyUtilization: 60,
        dailyHistory: [
          { date: '2026-03-09', percent: 25 },
          { date: '2026-03-10', percent: 60 },
        ],
      }));
      expect(ids).toContain('rare_spike');
    });

    it('triggers rare_night_owl between 1am-4am', () => {
      const ids = evaluateQuoteTriggers(makeCtx({
        now: new Date('2026-03-10T02:30:00'),
      }));
      expect(ids).toContain('rare_night_owl');
    });
  });

  describe('legendary triggers', () => {
    it('triggers legendary_7day_streak with 7 consecutive days of 80%+', () => {
      const history = Array.from({ length: 7 }, (_, i) => ({
        date: `2026-03-${String(4 + i).padStart(2, '0')}`,
        percent: 85,
      }));
      const ids = evaluateQuoteTriggers(makeCtx({ dailyHistory: history }));
      expect(ids).toContain('legendary_7day_streak');
    });

    it('does NOT trigger legendary_7day_streak with only 6 days', () => {
      const history = Array.from({ length: 6 }, (_, i) => ({
        date: `2026-03-${String(4 + i).padStart(2, '0')}`,
        percent: 85,
      }));
      const ids = evaluateQuoteTriggers(makeCtx({ dailyHistory: history }));
      expect(ids).not.toContain('legendary_7day_streak');
    });

    it('triggers legendary_first_call when firstApiCallSeen is false and utilization > 0', () => {
      const ids = evaluateQuoteTriggers(makeCtx({
        firstApiCallSeen: false,
        weeklyUtilization: 5,
      }));
      expect(ids).toContain('legendary_first_call');
    });

    it('triggers legendary_99plus when weekly >= 99', () => {
      const ids = evaluateQuoteTriggers(makeCtx({ weeklyUtilization: 99 }));
      expect(ids).toContain('legendary_99plus');
    });
  });

  describe('secret triggers', () => {
    it('triggers secret_christmas on Dec 25', () => {
      const ids = evaluateQuoteTriggers(makeCtx({
        now: new Date('2026-12-25T14:00:00'),
      }));
      expect(ids).toContain('secret_christmas');
    });

    it('triggers secret_3am at 3:00 AM', () => {
      const ids = evaluateQuoteTriggers(makeCtx({
        now: new Date('2026-03-10T03:00:00'),
      }));
      expect(ids).toContain('secret_3am');
    });

    it('triggers secret_100days when install was 100 days ago', () => {
      const ids = evaluateQuoteTriggers(makeCtx({
        installDate: '2025-11-30T00:00:00Z',
        now: new Date('2026-03-10T00:00:00'),
      }));
      expect(ids).toContain('secret_100days');
    });

    it('triggers secret_newyear on Seollal 2027 (Jan 29)', () => {
      const ids = evaluateQuoteTriggers(makeCtx({
        now: new Date('2027-01-29T10:00:00'),
      }));
      expect(ids).toContain('secret_newyear');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/core/__tests__/quote-triggers.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement evaluateQuoteTriggers**

```typescript
// src/core/quote-triggers.ts
import { TriggerContext } from '../shared/types';

/**
 * Korean lunar holiday dates (Seollal / Chuseok) for 2026-2029.
 * Format: MM-DD (local time).
 */
const SEOLLAL_DATES = ['02-17', '02-06', '01-26', '02-13']; // 2026-2029
const CHUSEOK_DATES = ['10-04', '09-24', '09-12', '10-01']; // 2026-2029

/**
 * Pure function: given current usage context, returns IDs of all triggered quotes.
 * No side effects. No Electron imports.
 *
 * @param ctx - Current usage and history context
 * @param currentCommonId - If a common quote is currently displayed, pass its ID to track it
 * @returns Array of triggered quote IDs
 */
export function evaluateQuoteTriggers(
  ctx: TriggerContext,
  currentCommonId?: string,
): string[] {
  const triggered: string[] = [];

  // Track currently displayed common quote
  if (currentCommonId) {
    triggered.push(currentCommonId);
  }

  const { weeklyUtilization, fiveHourUtilization, dailyHistory, installDate, firstApiCallSeen, now } = ctx;

  // === RARE ===

  // rare_exact0: weekly utilization exactly 0
  if (weeklyUtilization === 0) {
    triggered.push('rare_exact0');
  }

  // rare_5h_100: 5-hour utilization at 100%
  if (fiveHourUtilization !== null && fiveHourUtilization >= 100) {
    triggered.push('rare_5h_100');
  }

  // rare_exact50: weekly utilization exactly 50%
  if (weeklyUtilization === 50) {
    triggered.push('rare_exact50');
  }

  // rare_spike: usage jumped +30% vs previous day
  if (dailyHistory.length >= 2) {
    const sorted = [...dailyHistory].sort((a, b) => b.date.localeCompare(a.date));
    const today = sorted[0];
    const yesterday = sorted[1];
    if (today && yesterday && today.percent - yesterday.percent >= 30) {
      triggered.push('rare_spike');
    }
  }

  // rare_night_owl: between 1am and 4am local time
  const hour = now.getHours();
  if (hour >= 1 && hour < 4) {
    triggered.push('rare_night_owl');
  }

  // === LEGENDARY ===

  // legendary_99plus: weekly >= 99%
  if (weeklyUtilization !== null && weeklyUtilization >= 99) {
    triggered.push('legendary_99plus');
  }

  // legendary_first_call: first time seeing utilization > 0
  if (!firstApiCallSeen && weeklyUtilization !== null && weeklyUtilization > 0) {
    triggered.push('legendary_first_call');
  }

  // legendary_7day_streak: 7 consecutive days of 80%+
  if (dailyHistory.length >= 7) {
    const sorted = [...dailyHistory].sort((a, b) => b.date.localeCompare(a.date));
    const recentSeven = sorted.slice(0, 7);
    if (recentSeven.every((d) => d.percent >= 80)) {
      triggered.push('legendary_7day_streak');
    }
  }

  // === SECRET ===

  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const year = now.getFullYear();

  // secret_newyear: Seollal
  const seollalIndex = year - 2026;
  if (seollalIndex >= 0 && seollalIndex < SEOLLAL_DATES.length && mmdd === SEOLLAL_DATES[seollalIndex]) {
    triggered.push('secret_newyear');
  }

  // secret_chuseok: Chuseok
  const chuseokIndex = year - 2026;
  if (chuseokIndex >= 0 && chuseokIndex < CHUSEOK_DATES.length && mmdd === CHUSEOK_DATES[chuseokIndex]) {
    triggered.push('secret_chuseok');
  }

  // secret_christmas: Dec 25
  if (now.getMonth() === 11 && now.getDate() === 25) {
    triggered.push('secret_christmas');
  }

  // secret_3am: exactly between 3:00-3:59
  if (hour === 3) {
    triggered.push('secret_3am');
  }

  // secret_100days: 100 days since install
  const installMs = new Date(installDate).getTime();
  const daysSinceInstall = Math.floor((now.getTime() - installMs) / (24 * 60 * 60 * 1000));
  if (daysSinceInstall === 100) {
    triggered.push('secret_100days');
  }

  return triggered;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/core/__tests__/quote-triggers.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/quote-triggers.ts src/core/__tests__/quote-triggers.test.ts
git commit -m "feat(core): add evaluateQuoteTriggers with TDD — rare/legendary/secret triggers"
```

---

### Task 4: Create quote collection manager (TDD)

**Files:**
- Create: `src/core/quote-collection.ts`
- Create: `src/core/__tests__/quote-collection.test.ts`

- [ ] **Step 1: Write failing tests for collection logic**

```typescript
// src/core/__tests__/quote-collection.test.ts
import { describe, it, expect } from 'vitest';
import { QuoteCollectionManager } from '../quote-collection';
import { UnlockedQuote } from '../../shared/types';

describe('QuoteCollectionManager', () => {
  it('starts with empty unlocked list', () => {
    const mgr = new QuoteCollectionManager([]);
    expect(mgr.getUnlocked()).toEqual([]);
  });

  it('unlocks a new quote and returns true', () => {
    const mgr = new QuoteCollectionManager([]);
    const result = mgr.unlock('rare_exact0', new Date('2026-03-10T12:00:00Z'));
    expect(result).toBe(true);
    expect(mgr.getUnlocked()).toHaveLength(1);
    expect(mgr.getUnlocked()[0].id).toBe('rare_exact0');
  });

  it('returns false for duplicate unlock', () => {
    const mgr = new QuoteCollectionManager([]);
    mgr.unlock('rare_exact0', new Date('2026-03-10T12:00:00Z'));
    const result = mgr.unlock('rare_exact0', new Date('2026-03-11T12:00:00Z'));
    expect(result).toBe(false);
    expect(mgr.getUnlocked()).toHaveLength(1);
  });

  it('initializes from persisted data', () => {
    const persisted: UnlockedQuote[] = [
      { id: 'rare_exact0', unlockedAt: '2026-03-10T12:00:00Z' },
    ];
    const mgr = new QuoteCollectionManager(persisted);
    expect(mgr.isUnlocked('rare_exact0')).toBe(true);
    expect(mgr.isUnlocked('rare_exact50')).toBe(false);
  });

  it('getState returns correct counts by rarity', () => {
    const mgr = new QuoteCollectionManager([]);
    mgr.unlock('rare_exact0', new Date());
    mgr.unlock('common_happy_0', new Date());

    const state = mgr.getState();
    expect(state.unlocked).toHaveLength(2);
    expect(state.byRarity.rare.unlocked).toBe(1);
    expect(state.byRarity.common.unlocked).toBe(1);
    expect(state.totalCount).toBeGreaterThan(0);
  });

  it('processTriggered unlocks new IDs and returns newly unlocked', () => {
    const mgr = new QuoteCollectionManager([]);
    const newlyUnlocked = mgr.processTriggered(['rare_exact0', 'rare_exact50'], new Date());
    expect(newlyUnlocked).toEqual(['rare_exact0', 'rare_exact50']);
    expect(mgr.getUnlocked()).toHaveLength(2);

    // Second call with same IDs returns empty
    const again = mgr.processTriggered(['rare_exact0', 'rare_exact50'], new Date());
    expect(again).toEqual([]);
  });

  it('serialize returns array suitable for electron-store', () => {
    const mgr = new QuoteCollectionManager([]);
    mgr.unlock('rare_exact0', new Date('2026-03-10T12:00:00Z'));
    const serialized = mgr.serialize();
    expect(serialized).toEqual([{ id: 'rare_exact0', unlockedAt: '2026-03-10T12:00:00.000Z' }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/core/__tests__/quote-collection.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement QuoteCollectionManager**

```typescript
// src/core/quote-collection.ts
import { UnlockedQuote, CollectionState, QuoteRarity } from '../shared/types';
import { QUOTE_REGISTRY, getQuoteById } from './quote-registry';

/**
 * Manages the quote collection state. Pure logic, no Electron dependencies.
 * Caller is responsible for persisting via electron-store.
 */
export class QuoteCollectionManager {
  private unlocked: Map<string, UnlockedQuote>;

  constructor(persisted: UnlockedQuote[]) {
    this.unlocked = new Map(persisted.map((q) => [q.id, q]));
  }

  /** Try to unlock a quote. Returns true if newly unlocked, false if already unlocked or unknown. */
  unlock(id: string, now: Date): boolean {
    if (this.unlocked.has(id)) return false;
    if (!getQuoteById(id)) return false;
    this.unlocked.set(id, { id, unlockedAt: now.toISOString() });
    return true;
  }

  isUnlocked(id: string): boolean {
    return this.unlocked.has(id);
  }

  getUnlocked(): UnlockedQuote[] {
    return [...this.unlocked.values()];
  }

  /** Process a batch of triggered quote IDs. Returns array of newly unlocked IDs. */
  processTriggered(triggeredIds: string[], now: Date): string[] {
    const newlyUnlocked: string[] = [];
    for (const id of triggeredIds) {
      if (this.unlock(id, now)) {
        newlyUnlocked.push(id);
      }
    }
    return newlyUnlocked;
  }

  /** Get full collection state for UI display */
  getState(): CollectionState {
    const byRarity: Record<QuoteRarity, { unlocked: number; total: number }> = {
      common: { unlocked: 0, total: 0 },
      rare: { unlocked: 0, total: 0 },
      legendary: { unlocked: 0, total: 0 },
      secret: { unlocked: 0, total: 0 },
    };

    for (const entry of QUOTE_REGISTRY) {
      byRarity[entry.rarity].total++;
      if (this.unlocked.has(entry.id)) {
        byRarity[entry.rarity].unlocked++;
      }
    }

    return {
      unlocked: this.getUnlocked(),
      totalCount: QUOTE_REGISTRY.length,
      byRarity,
    };
  }

  /** Serialize for electron-store persistence */
  serialize(): UnlockedQuote[] {
    return this.getUnlocked();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/core/__tests__/quote-collection.test.ts`
Expected: All PASS

- [ ] **Step 5: Run all tests to confirm no regressions**

Run: `npx vitest run`
Expected: All existing + new tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/core/quote-collection.ts src/core/__tests__/quote-collection.test.ts
git commit -m "feat(core): add QuoteCollectionManager with TDD — unlock, dedup, state, serialize"
```

---

## Chunk 2: IPC, Preload, and Main Process Integration

### Task 5: Add i18n strings for collection and tray

**Files:**
- Modify: `src/shared/i18n.ts`

- [ ] **Step 1: Add new UI strings to all 4 locales**

Add these keys to each locale in `UI_STRINGS`:

```typescript
// Add to ko:
tab_settings: '설정',
tab_collection: '도감',
collection_title: '엄마 어록 도감',
collection_progress: '수집 현황',
rarity_common: '일반',
rarity_rare: '희귀',
rarity_legendary: '전설',
rarity_secret: '비밀',
recent_unlock: '최근 획득',
share_this_quote: '이 멘트 공유',
undiscovered: '???',
tray_share: '성적표 공유',
share_success: '클립보드에 복사됨!',
share_no_data: '아직 데이터 수집 중...',

// Add to en:
tab_settings: 'Settings',
tab_collection: 'Collection',
collection_title: "Mom's Quote Collection",
collection_progress: 'Progress',
rarity_common: 'Common',
rarity_rare: 'Rare',
rarity_legendary: 'Legendary',
rarity_secret: 'Secret',
recent_unlock: 'Recent Unlock',
share_this_quote: 'Share this quote',
undiscovered: '???',
tray_share: 'Share Report Card',
share_success: 'Copied to clipboard!',
share_no_data: 'Still collecting data...',

// Add to ja:
tab_settings: '設定',
tab_collection: '図鑑',
collection_title: 'ママの名言図鑑',
collection_progress: '収集状況',
rarity_common: '普通',
rarity_rare: 'レア',
rarity_legendary: '伝説',
rarity_secret: '秘密',
recent_unlock: '最近の獲得',
share_this_quote: 'この名言を共有',
undiscovered: '???',
tray_share: '成績表を共有',
share_success: 'クリップボードにコピー！',
share_no_data: 'まだデータ収集中...',

// Add to zh:
tab_settings: '设置',
tab_collection: '图鉴',
collection_title: '妈妈语录图鉴',
collection_progress: '收集进度',
rarity_common: '普通',
rarity_rare: '稀有',
rarity_legendary: '传说',
rarity_secret: '秘密',
recent_unlock: '最近获得',
share_this_quote: '分享这句语录',
undiscovered: '???',
tray_share: '分享成绩单',
share_success: '已复制到剪贴板！',
share_no_data: '还在收集数据...',
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/i18n.ts
git commit -m "feat(i18n): add collection tab, tray share, rarity label strings for 4 locales"
```

---

### Task 6: Update preload with new IPC methods

**Files:**
- Modify: `src/main/preload.ts`

- [ ] **Step 1: Add new channels and API methods**

Add to the `CHANNELS` const:

```typescript
COLLECTION_GET: 'mama:collection-get',
COLLECTION_UPDATED: 'mama:collection-updated',
SHARE_CARD: 'mama:share-card',
```

Add to the `contextBridge.exposeInMainWorld('electronAPI', { ... })` object:

```typescript
getCollection: (): Promise<unknown> => {
  return ipcRenderer.invoke(CHANNELS.COLLECTION_GET);
},

onCollectionUpdated: (callback: (state: unknown) => void) => {
  const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
  ipcRenderer.on(CHANNELS.COLLECTION_UPDATED, listener);
  return () => ipcRenderer.removeListener(CHANNELS.COLLECTION_UPDATED, listener);
},

shareCard: (quoteId?: string): Promise<unknown> => {
  return ipcRenderer.invoke(CHANNELS.SHARE_CARD, quoteId);
},
```

- [ ] **Step 2: Update the renderer type declarations**

In `src/renderer/electron.d.ts`, add the new methods to the `ElectronAPI` interface:

```typescript
getCollection(): Promise<unknown>;
onCollectionUpdated(callback: (state: unknown) => void): () => void;
shareCard(quoteId?: string): Promise<unknown>;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/main/preload.ts src/renderer/electron.d.ts
git commit -m "feat(ipc): add collection and share card channels to preload bridge"
```

---

### Task 7: Register new IPC handlers

**Files:**
- Modify: `src/main/ipc-handlers.ts`

- [ ] **Step 1: Add collection and share card IPC handlers**

Import the new dependencies and add handlers inside `registerIpcHandlers()`. The collection manager and share card function will be passed as parameters:

```typescript
// Add imports at top:
import { QuoteCollectionManager } from '../core/quote-collection';
import { generateShareCard } from './share-card';

// Add new parameter to registerIpcHandlers signature:
export function registerIpcHandlers(
  mainWindow?: BrowserWindow,
  collectionManager?: QuoteCollectionManager,
): void {
  // ... existing handlers ...

  // Collection
  ipcMain.handle(IPC_CHANNELS.COLLECTION_GET, () => {
    return collectionManager?.getState() ?? null;
  });

  // Share card
  ipcMain.handle(IPC_CHANNELS.SHARE_CARD, async (_event, quoteId?: string) => {
    return generateShareCard(quoteId);
  });
}
```

Also add `COLLECTION_GET` and `SHARE_CARD` to the `IPC_CHANNELS` import.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`
Expected: May have errors for `generateShareCard` (not yet created). That's OK — this will compile after Task 9.

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc-handlers.ts
git commit -m "feat(ipc): register collection-get and share-card handlers"
```

---

### Task 8: Wire triggers and collection into main.ts

**Files:**
- Modify: `src/main/main.ts`

- [ ] **Step 1: Add collection manager, trigger evaluation, and history tracking**

Add imports:

```typescript
import { evaluateQuoteTriggers } from '../core/quote-triggers';
import { QuoteCollectionManager } from '../core/quote-collection';
import { TriggerContext, DailyUtilRecord, IPC_CHANNELS as IPC } from '../shared/types';
```

Add state variables after existing ones:

```typescript
let collectionManager: QuoteCollectionManager;
let dailyHistory: DailyUtilRecord[] = [];
let installDate: string;
let firstApiCallSeen: boolean;
```

Initialize in `app.whenReady().then()`, before `createWindow()`:

```typescript
// Initialize collection from store
const storeData = getStore();
const persisted = storeData.get('unlockedQuotes', []) as any[];
collectionManager = new QuoteCollectionManager(persisted);

// Initialize tracking data
installDate = storeData.get('installDate', new Date().toISOString()) as string;
if (!storeData.get('installDate')) {
  storeData.set('installDate' as any, installDate);
}
firstApiCallSeen = storeData.get('firstApiCallSeen', false) as boolean;
dailyHistory = storeData.get('dailyUtilization', []) as DailyUtilRecord[];
```

Pass `collectionManager` to `registerIpcHandlers`:

```typescript
registerIpcHandlers(win, collectionManager);
```

Modify `broadcastState()` to evaluate triggers and update collection:

```typescript
function broadcastState(): void {
  if (!lastUsageInput) return;
  const state = computeMood(lastUsageInput);
  lastMamaState = state;

  // Evaluate triggers
  const now = new Date();
  const ctx: TriggerContext = {
    weeklyUtilization: state.utilizationPercent,
    fiveHourUtilization: state.fiveHourPercent,
    dailyHistory,
    installDate,
    firstApiCallSeen,
    now,
  };

  // Determine which common quote is currently displayed (for tracking)
  // This is a best-effort match based on the message content
  const triggeredIds = evaluateQuoteTriggers(ctx);
  const newlyUnlocked = collectionManager.processTriggered(triggeredIds, now);

  // Persist if anything changed
  if (newlyUnlocked.length > 0) {
    const store = getStore();
    store.set('unlockedQuotes' as any, collectionManager.serialize());

    // Notify renderer windows of collection update
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed()) {
        w.webContents.send(IPC.COLLECTION_UPDATED, collectionManager.getState());
      }
    }
  }

  // Track first API call
  if (!firstApiCallSeen && state.utilizationPercent > 0) {
    firstApiCallSeen = true;
    getStore().set('firstApiCallSeen' as any, true);
  }

  // Update daily history
  const today = now.toISOString().slice(0, 10);
  const existingIdx = dailyHistory.findIndex((d) => d.date === today);
  if (existingIdx >= 0) {
    dailyHistory[existingIdx].percent = state.utilizationPercent;
  } else {
    dailyHistory.push({ date: today, percent: state.utilizationPercent });
  }
  // Keep only 14 days
  dailyHistory = dailyHistory.slice(-14);
  getStore().set('dailyUtilization' as any, dailyHistory);

  // Broadcast mama state
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send(IPC.MAMA_STATE_UPDATE, state);
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`
Expected: May have errors for `share-card.ts` not yet existing — that's OK.

- [ ] **Step 3: Commit**

```bash
git add src/main/main.ts
git commit -m "feat(main): wire trigger evaluation and collection tracking into broadcastState"
```

---

## Chunk 3: Share Card

### Task 9: Create share card offscreen renderer

**Files:**
- Create: `src/main/share-card.ts`
- Create: `src/renderer/share-card-template/card.html`

- [ ] **Step 1: Create the card HTML template**

```html
<!-- src/renderer/share-card-template/card.html -->
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 600px;
    height: 400px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #fce7f3 0%, #fdf2f8 50%, #fff1f2 100%);
    display: flex;
    flex-direction: column;
    padding: 32px;
    overflow: hidden;
  }
  .header {
    font-size: 14px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 24px;
  }
  .content {
    display: flex;
    gap: 24px;
    flex: 1;
    align-items: center;
  }
  .character-area {
    width: 140px;
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .character-area img {
    width: 120px;
    height: 120px;
    image-rendering: pixelated;
  }
  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .mood-label {
    font-size: 28px;
    font-weight: 800;
    color: #1a1a1a;
  }
  .mood-emoji { margin-right: 8px; }
  .quote {
    font-size: 16px;
    color: #374151;
    line-height: 1.5;
    font-style: italic;
    padding: 12px 16px;
    background: rgba(255,255,255,0.7);
    border-radius: 12px;
    border-left: 4px solid var(--mood-color, #ec4899);
  }
  .bars {
    display: flex;
    gap: 16px;
    margin-top: 8px;
  }
  .bar-group { flex: 1; }
  .bar-label {
    font-size: 11px;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 4px;
  }
  .bar-track {
    height: 8px;
    background: rgba(0,0,0,0.1);
    border-radius: 4px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s;
  }
  .bar-value {
    font-size: 12px;
    font-weight: 700;
    color: #374151;
    margin-top: 2px;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid rgba(0,0,0,0.06);
  }
  .brand {
    font-size: 12px;
    color: #9ca3af;
    font-weight: 500;
  }
  .badge {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 10px;
    text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="header">Claude Mama Report Card</div>
  <div class="content">
    <div class="character-area">
      <img id="character" src="" alt="mama" />
    </div>
    <div class="info">
      <div class="mood-label">
        <span class="mood-emoji" id="moodEmoji"></span>
        <span id="moodText"></span>
      </div>
      <div class="quote" id="quote"></div>
      <div class="bars">
        <div class="bar-group">
          <div class="bar-label">7-Day</div>
          <div class="bar-track"><div class="bar-fill" id="weeklyBar"></div></div>
          <div class="bar-value" id="weeklyValue"></div>
        </div>
        <div class="bar-group">
          <div class="bar-label">5-Hour</div>
          <div class="bar-track"><div class="bar-fill" id="fiveHourBar"></div></div>
          <div class="bar-value" id="fiveHourValue"></div>
        </div>
      </div>
    </div>
  </div>
  <div class="footer">
    <span class="brand">claude-mama</span>
    <span class="badge" id="rarityBadge"></span>
  </div>

  <script>
    const MOOD_CONFIG = {
      angry:    { emoji: '😤', color: '#ef4444' },
      worried:  { emoji: '😟', color: '#eab308' },
      happy:    { emoji: '😊', color: '#22c55e' },
      proud:    { emoji: '🥹', color: '#f59e0b' },
      confused: { emoji: '❓', color: '#8b5cf6' },
      sleeping: { emoji: '😴', color: '#6b7280' },
    };
    const MOOD_NAMES = {
      angry: '분노', worried: '걱정', happy: '행복',
      proud: '자랑스러움', confused: '혼란', sleeping: '수면',
    };

    window.populateCard = function(data) {
      const cfg = MOOD_CONFIG[data.mood] || MOOD_CONFIG.confused;
      document.getElementById('moodEmoji').textContent = cfg.emoji;
      document.getElementById('moodText').textContent = MOOD_NAMES[data.mood] || data.mood;
      document.getElementById('quote').textContent = `"${data.message}"`;
      document.getElementById('quote').style.setProperty('--mood-color', cfg.color);

      const weeklyBar = document.getElementById('weeklyBar');
      weeklyBar.style.width = `${data.weeklyPercent}%`;
      weeklyBar.style.background = cfg.color;
      document.getElementById('weeklyValue').textContent = `${data.weeklyPercent.toFixed(1)}%`;

      const fiveHourBar = document.getElementById('fiveHourBar');
      const fhPct = data.fiveHourPercent ?? 0;
      fiveHourBar.style.width = `${fhPct}%`;
      fiveHourBar.style.background = fhPct > 90 ? '#ef4444' : '#3b82f6';
      document.getElementById('fiveHourValue').textContent = data.fiveHourPercent != null ? `${fhPct.toFixed(1)}%` : '—';

      if (data.characterDataUrl) {
        document.getElementById('character').src = data.characterDataUrl;
      }

      const badge = document.getElementById('rarityBadge');
      if (data.rarityBadge) {
        badge.textContent = data.rarityBadge;
        badge.style.background = cfg.color + '20';
        badge.style.color = cfg.color;
      }
    };
  </script>
</body>
</html>
```

- [ ] **Step 2: Create the share card module**

```typescript
// src/main/share-card.ts
import { BrowserWindow, clipboard, nativeImage, Notification, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { getStore } from './ipc-handlers';
import { t } from '../shared/i18n';
import { MamaState, Locale } from '../shared/types';
import { getQuoteById } from '../core/quote-registry';

let offscreenWin: BrowserWindow | null = null;
let isGenerating = false;

// Store reference to current mama state (set by main.ts)
let currentMamaState: MamaState | null = null;

export function setShareCardState(state: MamaState): void {
  currentMamaState = state;
}

function getOffscreenWindow(): BrowserWindow {
  if (offscreenWin && !offscreenWin.isDestroyed()) {
    return offscreenWin;
  }

  const templatePath = app.isPackaged
    ? path.join(app.getAppPath(), 'dist/renderer/share-card-template/card.html')
    : path.join(process.cwd(), 'src/renderer/share-card-template/card.html');

  offscreenWin = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    offscreen: true,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: false,
    },
  });

  offscreenWin.loadFile(templatePath);

  offscreenWin.on('closed', () => {
    offscreenWin = null;
  });

  return offscreenWin;
}

/**
 * Generate a share card PNG and copy to clipboard.
 * Returns true on success, false on failure.
 */
export async function generateShareCard(quoteId?: string): Promise<boolean> {
  // Mutex: prevent concurrent generation
  if (isGenerating) return false;
  isGenerating = true;

  const locale = getStore().get('locale', 'ko') as Locale;

  try {
    // Guard: no state available
    if (!currentMamaState) {
      new Notification({
        title: 'Claude Mama',
        body: t(locale, 'share_no_data'),
      }).show();
      return false;
    }

    const win = getOffscreenWindow();

    // Wait for page to load if needed
    await new Promise<void>((resolve) => {
      if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', () => resolve());
      } else {
        resolve();
      }
    });

    // Read character image as data URL
    const charImagePath = app.isPackaged
      ? path.join(app.getAppPath(), 'dist/renderer/assets/claude-mama.png')
      : path.join(process.cwd(), 'src/renderer/assets/claude-mama.png');

    let characterDataUrl = '';
    try {
      const buf = fs.readFileSync(charImagePath);
      characterDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    } catch { /* fallback: no image */ }

    // Determine rarity badge if sharing a specific quote
    let rarityBadge = '';
    if (quoteId) {
      const entry = getQuoteById(quoteId);
      if (entry && entry.rarity !== 'common') {
        const rarityKey = `rarity_${entry.rarity}` as Parameters<typeof t>[1];
        rarityBadge = t(locale, rarityKey);
      }
    }

    // Populate the card
    const cardData = {
      mood: currentMamaState.mood,
      message: currentMamaState.message,
      weeklyPercent: currentMamaState.utilizationPercent,
      fiveHourPercent: currentMamaState.fiveHourPercent,
      characterDataUrl,
      rarityBadge,
    };

    await win.webContents.executeJavaScript(`window.populateCard(${JSON.stringify(cardData)})`);

    // Wait a frame for rendering
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Capture at 2x DPI
    const image = await win.webContents.capturePage({
      x: 0, y: 0, width: 600, height: 400,
    });

    if (image.isEmpty()) {
      // Retry once
      await new Promise((resolve) => setTimeout(resolve, 200));
      const retry = await win.webContents.capturePage({
        x: 0, y: 0, width: 600, height: 400,
      });
      if (retry.isEmpty()) {
        return false;
      }
      clipboard.writeImage(retry);
    } else {
      clipboard.writeImage(image);
    }

    new Notification({
      title: 'Claude Mama',
      body: t(locale, 'share_success'),
    }).show();

    return true;
  } catch (err) {
    console.error('[share-card] Error generating card:', err);
    return false;
  } finally {
    isGenerating = false;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`
Expected: No errors (may need to address any type issues)

- [ ] **Step 4: Commit**

```bash
git add src/main/share-card.ts src/renderer/share-card-template/card.html
git commit -m "feat(share): add offscreen share card renderer with clipboard copy"
```

---

### Task 10: Add share button to tray menu

**Files:**
- Modify: `src/main/tray.ts`

- [ ] **Step 1: Add "Share Report Card" item to tray context menu**

Import the share function and i18n:

```typescript
import { generateShareCard } from './share-card';
import { getStore } from './ipc-handlers';
import { t } from '../shared/i18n';
import { Locale } from '../shared/types';
```

In `updateContextMenu`, add a new menu item before the Settings separator:

```typescript
function updateContextMenu(mainWindow: BrowserWindow): void {
  if (!trayInstance) return;

  const isVisible = mainWindow.isVisible();
  const locale = getStore().get('locale', 'ko') as Locale;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isVisible ? 'Hide Mama' : 'Show Mama',
      click: () => toggleWindowVisibility(mainWindow),
    },
    { type: 'separator' },
    {
      label: t(locale, 'tray_share'),
      click: () => { void generateShareCard(); },
    },
    {
      label: 'Settings...',
      click: () => showSettingsWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  trayInstance.setContextMenu(contextMenu);
}
```

- [ ] **Step 2: Wire setShareCardState in main.ts**

In `src/main/main.ts`, import `setShareCardState` from `./share-card` and call it in `broadcastState()` after computing state:

```typescript
import { setShareCardState } from './share-card';

// Inside broadcastState, after: lastMamaState = state;
setShareCardState(state);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/main/tray.ts src/main/main.ts
git commit -m "feat(tray): add Share Report Card menu item with i18n"
```

---

## Chunk 4: Collection UI

### Task 11: Create Collection page component

**Files:**
- Create: `src/renderer/pages/Collection.tsx`

- [ ] **Step 1: Create the Collection page**

```tsx
// src/renderer/pages/Collection.tsx
import React, { useEffect, useState } from 'react';
import { CollectionState, QuoteRarity, Locale, UnlockedQuote } from '../../shared/types';
import { t, UIStringKey } from '../../shared/i18n';
import { QUOTE_REGISTRY } from '../../core/quote-registry';

const RARITY_ORDER: QuoteRarity[] = ['common', 'rare', 'legendary', 'secret'];
const RARITY_COLORS: Record<QuoteRarity, string> = {
  common: '#6b7280',
  rare: '#3b82f6',
  legendary: '#f59e0b',
  secret: '#8b5cf6',
};

interface Props {
  locale: Locale;
}

export default function Collection({ locale }: Props) {
  const [collection, setCollection] = useState<CollectionState | null>(null);
  const i = (key: UIStringKey) => t(locale, key);

  useEffect(() => {
    window.electronAPI.getCollection().then((c) => {
      if (c) setCollection(c as CollectionState);
    });
    const unsub = window.electronAPI.onCollectionUpdated((state) => {
      setCollection(state as CollectionState);
    });
    return unsub;
  }, []);

  if (!collection) {
    return <div style={s.empty}>{t(locale, 'loading')}</div>;
  }

  const totalUnlocked = Object.values(collection.byRarity).reduce((sum, r) => sum + r.unlocked, 0);
  const progressPct = collection.totalCount > 0 ? (totalUnlocked / collection.totalCount) * 100 : 0;

  // Sort unlocked by most recent
  const recentUnlocks = [...collection.unlocked]
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
    .slice(0, 5);

  return (
    <div style={s.wrapper}>
      {/* Progress */}
      <div style={s.card}>
        <div style={s.cardLabel}>{i('collection_progress')}</div>
        <div style={s.progressText}>
          {totalUnlocked} / {collection.totalCount} ({progressPct.toFixed(0)}%)
        </div>
        <div style={s.barTrack}>
          <div style={{ ...s.barFill, width: `${progressPct}%` }} />
        </div>
      </div>

      {/* By rarity */}
      <div style={s.card}>
        {RARITY_ORDER.map((rarity) => {
          const data = collection.byRarity[rarity];
          const pct = data.total > 0 ? (data.unlocked / data.total) * 100 : 0;
          const rarityKey = `rarity_${rarity}` as UIStringKey;
          return (
            <div key={rarity} style={s.rarityRow}>
              <span style={{ ...s.rarityDot, background: RARITY_COLORS[rarity] }} />
              <span style={s.rarityLabel}>{i(rarityKey)}</span>
              <span style={s.rarityCount}>
                {data.unlocked}/{data.total}
              </span>
              <div style={s.rarityBarTrack}>
                <div style={{
                  ...s.rarityBarFill,
                  width: `${pct}%`,
                  background: RARITY_COLORS[rarity],
                }} />
              </div>
              {data.unlocked === data.total && data.total > 0 && (
                <span style={s.checkmark}>✓</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent unlocks */}
      {recentUnlocks.length > 0 && (
        <div style={s.card}>
          <div style={s.cardLabel}>{i('recent_unlock')}</div>
          {recentUnlocks.map((unlock) => {
            const entry = QUOTE_REGISTRY.find((q) => q.id === unlock.id);
            if (!entry) return null;
            const msg = entry.messages[locale] || entry.messages.ko;
            const date = new Date(unlock.unlockedAt).toLocaleDateString();
            return (
              <div key={unlock.id} style={s.unlockItem}>
                <span style={{ ...s.rarityDot, background: RARITY_COLORS[entry.rarity] }} />
                <div style={s.unlockText}>
                  <div style={s.unlockMsg}>"{msg}"</div>
                  <div style={s.unlockDate}>{date}</div>
                </div>
                {entry.rarity !== 'common' && (
                  <button
                    style={s.shareBtn}
                    onClick={() => window.electronAPI.shareCard(unlock.id)}
                    title={i('share_this_quote')}
                  >
                    📤
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 10 },
  empty: { color: '#888', textAlign: 'center', marginTop: 40 },
  card: {
    background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #e5e7eb',
  },
  cardLabel: {
    fontSize: 11, fontWeight: 700, color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
  },
  progressText: { fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 },
  barTrack: { height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', background: '#ec4899', borderRadius: 4 },
  rarityRow: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13,
  },
  rarityDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  rarityLabel: { width: 40, fontWeight: 600, color: '#374151' },
  rarityCount: { width: 40, fontSize: 12, color: '#6b7280', textAlign: 'right' },
  rarityBarTrack: {
    flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden',
  },
  rarityBarFill: { height: '100%', borderRadius: 3 },
  checkmark: { color: '#22c55e', fontWeight: 700, fontSize: 14 },
  unlockItem: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  unlockText: { flex: 1 },
  unlockMsg: { fontSize: 13, color: '#374151', fontStyle: 'italic' },
  unlockDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  shareBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4,
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/pages/Collection.tsx
git commit -m "feat(ui): add Collection (dogam) page component"
```

---

### Task 12: Add tab navigation to Settings and route Collection

**Files:**
- Modify: `src/renderer/pages/Settings.tsx`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Add tab navigation to Settings page**

At the top of the `Settings` component, after the titlebar and before the scrollable content, add a tab bar. Import `t` and use tab keys:

Add state for active tab:

```typescript
const [activeTab, setActiveTab] = useState<'settings' | 'collection'>('settings');
```

Add tab bar after the titlebar `<div>` and before `<div style={s.content}>`:

```tsx
<div style={s.tabBar}>
  <button
    style={{ ...s.tab, ...(activeTab === 'settings' ? s.tabActive : {}) }}
    onClick={() => setActiveTab('settings')}
  >
    {i('tab_settings')}
  </button>
  <button
    style={{ ...s.tab, ...(activeTab === 'collection' ? s.tabActive : {}) }}
    onClick={() => setActiveTab('collection')}
  >
    {i('tab_collection')}
  </button>
</div>
```

Import Collection component:

```typescript
import Collection from './Collection';
```

Wrap the existing settings content in a conditional and add Collection:

```tsx
{activeTab === 'settings' ? (
  <div style={s.content}>
    {/* ...existing settings cards and save button... */}
  </div>
) : (
  <div style={s.content}>
    <Collection locale={locale} />
  </div>
)}
```

Add tab styles to the `s` object:

```typescript
tabBar: {
  display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb',
  flexShrink: 0,
},
tab: {
  flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 500,
  border: 'none', background: 'transparent', color: '#6b7280',
  cursor: 'pointer', borderBottom: '2px solid transparent',
},
tabActive: {
  color: '#ec4899', borderBottomColor: '#ec4899', fontWeight: 600,
},
```

- [ ] **Step 2: Verify the app compiles and runs**

Run: `npm run build:main && npm run build:renderer`
Expected: Both build successfully

- [ ] **Step 3: Manual test**

Run: `npm run dev`
- Open Settings window from tray
- Verify Settings tab shows existing settings
- Switch to Collection tab — shows empty collection with 0/N progress
- Verify tray shows "Share Report Card" / "성적표 공유" menu item

- [ ] **Step 4: Commit**

```bash
git add src/renderer/pages/Settings.tsx src/renderer/pages/Collection.tsx src/renderer/App.tsx
git commit -m "feat(ui): add tab navigation with Settings and Collection tabs"
```

---

### Task 13: Run all tests and verify build

- [ ] **Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: All tests pass (existing mood-engine tests + new quote-triggers + quote-collection)

- [ ] **Step 2: Full production build**

Run: `npm run build`
Expected: Build completes successfully

- [ ] **Step 3: TypeScript strict check**

Run: `npx tsc -p tsconfig.main.json --noEmit`
Expected: No errors

- [ ] **Step 4: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: fix any remaining type/build issues from viral features"
```

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | 1-4 | Types, quote registry, triggers (TDD), collection manager (TDD) |
| 2 | 5-8 | i18n, preload IPC, handlers, main.ts integration |
| 3 | 9-10 | Share card offscreen renderer, tray menu |
| 4 | 11-13 | Collection UI, tab navigation, full build verification |

Tasks 1-4 are pure core with tests. Tasks 5-8 wire the IPC layer. Tasks 9-10 build the share card. Tasks 11-13 build the UI. Each chunk produces a working, committable state.
