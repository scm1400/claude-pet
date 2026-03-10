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

  processTriggered(triggeredIds: string[], now: Date): string[] {
    const newlyUnlocked: string[] = [];
    for (const id of triggeredIds) {
      if (this.unlock(id, now)) {
        newlyUnlocked.push(id);
      }
    }
    return newlyUnlocked;
  }

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

  serialize(): UnlockedQuote[] {
    return this.getUnlocked();
  }
}
