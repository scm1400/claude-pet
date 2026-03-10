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
