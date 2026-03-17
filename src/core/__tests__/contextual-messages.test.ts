import { describe, it, expect } from 'vitest';
import { evaluateContextTrigger, getContextualMessage } from '../contextual-messages';
import { TriggerContext, PetMood, DailyUtilRecord } from '../../shared/types';

function makeCtx(overrides: Partial<TriggerContext> = {}): TriggerContext {
  return {
    weeklyUtilization: 30,
    fiveHourUtilization: null,
    dailyHistory: [],
    installDate: '2026-01-01T00:00:00Z',
    firstApiCallSeen: true,
    now: new Date('2026-03-14T10:00:00Z'), // Saturday
    resetsAt: null,
    ...overrides,
  };
}

describe('evaluateContextTrigger', () => {
  it('returns "weekend" on Saturday', () => {
    const ctx = makeCtx({ now: new Date('2026-03-14T10:00:00Z') });
    expect(evaluateContextTrigger(ctx)).toBe('weekend');
  });

  it('returns "weekend" on Sunday', () => {
    const ctx = makeCtx({ now: new Date('2026-03-15T10:00:00Z') });
    expect(evaluateContextTrigger(ctx)).toBe('weekend');
  });

  it('returns null on weekday with no special context', () => {
    const ctx = makeCtx({ now: new Date('2026-03-16T10:00:00Z') });
    expect(evaluateContextTrigger(ctx)).toBeNull();
  });

  it('returns "unusedStreak" when 2+ consecutive zero-usage days', () => {
    const history: DailyUtilRecord[] = [
      { date: '2026-03-12', percent: 0 },
      { date: '2026-03-13', percent: 0 },
    ];
    const ctx = makeCtx({ now: new Date('2026-03-13T10:00:00Z'), dailyHistory: history });
    expect(evaluateContextTrigger(ctx)).toBe('unusedStreak');
  });

  it('returns "spike" when usage jumped 30%+ from yesterday', () => {
    const history: DailyUtilRecord[] = [
      { date: '2026-03-12', percent: 20 },
      { date: '2026-03-13', percent: 55 },
    ];
    const ctx = makeCtx({ now: new Date('2026-03-13T10:00:00Z'), weeklyUtilization: 55, dailyHistory: history });
    expect(evaluateContextTrigger(ctx)).toBe('spike');
  });

  it('returns "resetImminent" when reset in <3 hours and usage <50%', () => {
    const resetTime = new Date('2026-03-13T12:00:00Z');
    const ctx = makeCtx({ now: new Date('2026-03-13T10:00:00Z'), weeklyUtilization: 30, resetsAt: resetTime.toISOString() });
    expect(evaluateContextTrigger(ctx)).toBe('resetImminent');
  });

  it('returns null for resetImminent when usage >=50%', () => {
    const resetTime = new Date('2026-03-13T12:00:00Z');
    const ctx = makeCtx({ now: new Date('2026-03-13T10:00:00Z'), weeklyUtilization: 60, resetsAt: resetTime.toISOString() });
    expect(evaluateContextTrigger(ctx)).not.toBe('resetImminent');
  });

  it('unusedStreak has higher priority than weekend', () => {
    const history: DailyUtilRecord[] = [
      { date: '2026-03-13', percent: 0 },
      { date: '2026-03-14', percent: 0 },
    ];
    const ctx = makeCtx({ now: new Date('2026-03-14T10:00:00Z'), dailyHistory: history });
    expect(evaluateContextTrigger(ctx)).toBe('unusedStreak');
  });
});

describe('getContextualMessage', () => {
  it('returns contextual message when trigger matches mood', () => {
    const ctx = makeCtx({ now: new Date('2026-03-14T10:00:00Z') });
    const msg = getContextualMessage('worried', 'ko', ctx);
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe('string');
  });

  it('falls back to regular message when no trigger matches', () => {
    const ctx = makeCtx({ now: new Date('2026-03-16T10:00:00Z') });
    const msg = getContextualMessage('happy', 'ko', ctx);
    expect(msg).toBeTruthy();
  });
});
