import { UnlockedBadge, BadgeState, BadgeTier } from '../shared/types';
import { BADGE_REGISTRY, getBadgeById } from './badge-registry';

export class BadgeManager {
  private unlocked: Map<string, UnlockedBadge>;

  constructor(persisted: UnlockedBadge[]) {
    this.unlocked = new Map(persisted.map((b) => [b.id, b]));
  }

  unlock(id: string, now: Date): boolean {
    if (this.unlocked.has(id)) return false;
    if (!getBadgeById(id)) return false;
    this.unlocked.set(id, { id, unlockedAt: now.toISOString() });
    return true;
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

  getState(): BadgeState {
    const byTier: Record<BadgeTier, { unlocked: number; total: number }> = {
      bronze: { unlocked: 0, total: 0 },
      silver: { unlocked: 0, total: 0 },
      gold: { unlocked: 0, total: 0 },
    };
    for (const entry of BADGE_REGISTRY) {
      byTier[entry.tier].total++;
      if (this.unlocked.has(entry.id)) {
        byTier[entry.tier].unlocked++;
      }
    }
    return {
      unlocked: [...this.unlocked.values()],
      totalCount: BADGE_REGISTRY.length,
      byTier,
    };
  }

  serialize(): UnlockedBadge[] {
    return [...this.unlocked.values()];
  }
}
