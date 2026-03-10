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
    it('returns the common quote ID when passed as currentCommonId', () => {
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
      const ids = evaluateQuoteTriggers(makeCtx({ now: new Date('2026-03-10T02:30:00') }));
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
      const ids = evaluateQuoteTriggers(makeCtx({ firstApiCallSeen: false, weeklyUtilization: 5 }));
      expect(ids).toContain('legendary_first_call');
    });
    it('triggers legendary_99plus when weekly >= 99', () => {
      const ids = evaluateQuoteTriggers(makeCtx({ weeklyUtilization: 99 }));
      expect(ids).toContain('legendary_99plus');
    });
  });

  describe('secret triggers', () => {
    it('triggers secret_christmas on Dec 25', () => {
      const ids = evaluateQuoteTriggers(makeCtx({ now: new Date('2026-12-25T14:00:00') }));
      expect(ids).toContain('secret_christmas');
    });
    it('triggers secret_3am at 3:00 AM', () => {
      const ids = evaluateQuoteTriggers(makeCtx({ now: new Date('2026-03-10T03:00:00') }));
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
      const ids = evaluateQuoteTriggers(makeCtx({ now: new Date('2027-01-29T10:00:00') }));
      expect(ids).toContain('secret_newyear');
    });
  });
});
