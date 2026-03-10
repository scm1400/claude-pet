import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeMood } from '../mood-engine';
import { MESSAGE_POOLS } from '../messages';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('computeMood — threshold boundaries', () => {
  it('0% → angry', () => {
    const state = computeMood({ weeklyUtilization: 0, fiveHourUtilization: null, error: null });
    expect(state.mood).toBe('angry');
  });

  it('14% → angry', () => {
    const state = computeMood({ weeklyUtilization: 14, fiveHourUtilization: null, error: null });
    expect(state.mood).toBe('angry');
  });

  it('15% → worried', () => {
    const state = computeMood({ weeklyUtilization: 15, fiveHourUtilization: null, error: null });
    expect(state.mood).toBe('worried');
  });

  it('49% → worried', () => {
    const state = computeMood({ weeklyUtilization: 49, fiveHourUtilization: null, error: null });
    expect(state.mood).toBe('worried');
  });

  it('50% → happy', () => {
    const state = computeMood({ weeklyUtilization: 50, fiveHourUtilization: null, error: null });
    expect(state.mood).toBe('happy');
  });

  it('84% → happy', () => {
    const state = computeMood({ weeklyUtilization: 84, fiveHourUtilization: null, error: null });
    expect(state.mood).toBe('happy');
  });

  it('85% → proud', () => {
    const state = computeMood({ weeklyUtilization: 85, fiveHourUtilization: null, error: null });
    expect(state.mood).toBe('proud');
  });

  it('100% → proud', () => {
    const state = computeMood({ weeklyUtilization: 100, fiveHourUtilization: null, error: null });
    expect(state.mood).toBe('proud');
  });
});

describe('computeMood — 5-hour override', () => {
  it('fiveHourUtilization > 90 emits fiveHourWarning message regardless of weekly mood', () => {
    // weekly = 20% → would normally be "worried"
    const state = computeMood({ weeklyUtilization: 20, fiveHourUtilization: 91, error: null });
    expect(state.mood).toBe('worried'); // mood stays as computed from weekly
    expect(state.fiveHourPercent).toBe(91);
    // message should be a fiveHourWarning message
    expect(MESSAGE_POOLS.ko.fiveHourWarning).toContain(state.message);
  });

  it('fiveHourUtilization = 90 does NOT trigger override', () => {
    const state = computeMood({ weeklyUtilization: 60, fiveHourUtilization: 90, error: null });
    expect(state.mood).toBe('happy');
    expect(MESSAGE_POOLS.ko.fiveHourWarning).not.toContain(state.message);
  });

  it('fiveHourUtilization = null does not trigger override', () => {
    const state = computeMood({ weeklyUtilization: 80, fiveHourUtilization: null, error: null });
    expect(state.mood).toBe('happy');
  });
});

describe('computeMood — error / null input', () => {
  it('error !== null → confused mood', () => {
    const state = computeMood({ weeklyUtilization: null, fiveHourUtilization: null, error: 'Network error' });
    expect(state.mood).toBe('confused');
    expect(MESSAGE_POOLS.ko.confused).toContain(state.message);
  });

  it('weeklyUtilization = null with no error → confused mood', () => {
    const state = computeMood({ weeklyUtilization: null, fiveHourUtilization: null, error: null });
    expect(state.mood).toBe('confused');
  });

  it('dataSource is propagated on error state', () => {
    const state = computeMood({
      weeklyUtilization: null,
      fiveHourUtilization: null,
      error: 'Cache unavailable',
      dataSource: 'cache',
      stale: true,
    });
    expect(state.dataSource).toBe('cache');
    expect(state.stale).toBe(true);
  });
});

describe('computeMood — no credentials → sleeping', () => {
  it('NO_CREDENTIALS error → sleeping mood', () => {
    const state = computeMood({ weeklyUtilization: null, fiveHourUtilization: null, error: 'NO_CREDENTIALS' });
    expect(state.mood).toBe('sleeping');
    expect(MESSAGE_POOLS.ko.sleeping).toContain(state.message);
  });

  it('sleeping state has dataSource none', () => {
    const state = computeMood({ weeklyUtilization: null, fiveHourUtilization: null, error: 'NO_CREDENTIALS' });
    expect(state.dataSource).toBe('none');
    expect(state.stale).toBe(false);
  });
});

describe('computeMood — message stability', () => {
  it('same input in the same 5-min window produces the same message', () => {
    const input = { weeklyUtilization: 60, fiveHourUtilization: null, error: null };
    const state1 = computeMood(input);
    const state2 = computeMood(input);
    expect(state1.message).toBe(state2.message);
  });

  it('messages may differ across 5-min windows', () => {
    // Simulate two different windows by mocking Date.now
    const input = { weeklyUtilization: 60, fiveHourUtilization: null, error: null };

    // Window 1: use a time that maps to index 0
    const baseWindow = Math.floor(Date.now() / 120_000);
    vi.spyOn(Date, 'now').mockReturnValue(baseWindow * 120_000);
    const state1 = computeMood(input);

    // Window 2: advance by 5 pool-lengths windows to guarantee different index is possible
    // We just verify that the mechanism can produce different messages by checking the pool
    vi.spyOn(Date, 'now').mockReturnValue((baseWindow + 1) * 120_000);
    const state2 = computeMood(input);

    // Both should be valid happy messages
    expect(MESSAGE_POOLS.ko.happy).toContain(state1.message);
    expect(MESSAGE_POOLS.ko.happy).toContain(state2.message);
    // They may differ — that's the goal, but not guaranteed since pool wraps
  });
});

describe('computeMood — state shape', () => {
  it('returns all required MamaState fields', () => {
    const state = computeMood({ weeklyUtilization: 60, fiveHourUtilization: 50, error: null, resetsAt: '2026-03-10T00:00:00Z', fiveHourResetsAt: '2026-03-09T18:00:00Z', dataSource: 'api', stale: false });
    expect(state).toHaveProperty('mood');
    expect(state).toHaveProperty('utilizationPercent', 60);
    expect(state).toHaveProperty('fiveHourPercent', 50);
    expect(state).toHaveProperty('message');
    expect(state).toHaveProperty('resetsAt', '2026-03-10T00:00:00Z');
    expect(state).toHaveProperty('fiveHourResetsAt', '2026-03-09T18:00:00Z');
    expect(state).toHaveProperty('dataSource', 'api');
    expect(state).toHaveProperty('stale', false);
    expect(state).toHaveProperty('error', null);
  });
});
