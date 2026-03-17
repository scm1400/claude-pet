import { describe, it, expect } from 'vitest';
import { computePetState, DEFAULT_PET_STATE, UsageInput } from '../pet-state-engine';
import { PetEvent } from '../../shared/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<UsageInput> = {}): UsageInput {
  return {
    weeklyUtilization: 50,
    fiveHourUtilization: 30,
    error: null,
    rateLimited: false,
    locale: 'en',
    ...overrides,
  };
}

function recentEvent(type: PetEvent['type']): PetEvent {
  return { type, timestamp: new Date().toISOString() };
}

function oldEvent(type: PetEvent['type']): PetEvent {
  // 10 minutes ago — outside the 5-minute window
  return { type, timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() };
}

// ---------------------------------------------------------------------------
// 1. Error cases
// ---------------------------------------------------------------------------

describe('computePetState – error cases', () => {
  it('NO_CREDENTIALS error returns sleeping mood', () => {
    const state = computePetState(makeInput({ error: 'NO_CREDENTIALS' }), DEFAULT_PET_STATE);
    expect(state.mood).toBe('sleeping');
    expect(state.utilizationPercent).toBe(0);
    expect(state.rateLimited).toBe(false);
    expect(state.error).toBe('NO_CREDENTIALS');
  });

  it('rateLimited with utilization data derives mood from utilization', () => {
    // weeklyUtilization 60 → 50-85 range → 'happy'
    const state = computePetState(
      makeInput({ rateLimited: true, weeklyUtilization: 60 }),
      DEFAULT_PET_STATE,
    );
    expect(state.mood).toBe('happy');
    expect(state.rateLimited).toBe(true);
    expect(state.utilizationPercent).toBe(60);
  });

  it('rateLimited with utilization < 20 → worried', () => {
    const state = computePetState(
      makeInput({ rateLimited: true, weeklyUtilization: 10 }),
      DEFAULT_PET_STATE,
    );
    expect(state.mood).toBe('worried');
    expect(state.rateLimited).toBe(true);
  });

  it('rateLimited with utilization 20-49 → bored', () => {
    const state = computePetState(
      makeInput({ rateLimited: true, weeklyUtilization: 35 }),
      DEFAULT_PET_STATE,
    );
    expect(state.mood).toBe('bored');
  });

  it('rateLimited with utilization >= 85 → playful', () => {
    const state = computePetState(
      makeInput({ rateLimited: true, weeklyUtilization: 90 }),
      DEFAULT_PET_STATE,
    );
    expect(state.mood).toBe('playful');
  });

  it('rateLimited without utilization data returns confused mood', () => {
    const state = computePetState(
      makeInput({ rateLimited: true, weeklyUtilization: null }),
      DEFAULT_PET_STATE,
    );
    expect(state.mood).toBe('confused');
    expect(state.rateLimited).toBe(true);
    expect(state.utilizationPercent).toBe(0);
  });

  it('API error (non-null error, not NO_CREDENTIALS) returns confused mood', () => {
    const state = computePetState(
      makeInput({ error: 'FETCH_ERROR' }),
      DEFAULT_PET_STATE,
    );
    expect(state.mood).toBe('confused');
    expect(state.error).toBe('FETCH_ERROR');
    expect(state.rateLimited).toBe(false);
  });

  it('null weeklyUtilization (no error) returns confused mood', () => {
    const state = computePetState(
      makeInput({ weeklyUtilization: null, error: null }),
      DEFAULT_PET_STATE,
    );
    expect(state.mood).toBe('confused');
    expect(state.utilizationPercent).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Mood derivation
// ---------------------------------------------------------------------------

describe('computePetState – mood derivation', () => {
  // deriveMood: hunger < 30 && happiness > 60 && energy > 40 → happy
  it('low hunger + high happiness + good energy → happy', () => {
    const prev = { ...DEFAULT_PET_STATE, hunger: 20, happiness: 70, energy: 50 };
    // weeklyUtilization > 50 reduces hunger by 5; happiness adjusts slightly
    // Use values that ensure deriveMood lands on 'happy' after adjustments
    const state = computePetState(makeInput({ weeklyUtilization: 60, fiveHourUtilization: 30 }), prev);
    expect(state.mood).toBe('happy');
  });

  // deriveMood: happiness > 70 && energy > 50 → playful
  it('high happiness + high energy → playful', () => {
    const prev = { ...DEFAULT_PET_STATE, hunger: 50, happiness: 80, energy: 60 };
    // fiveHourUtilization = 0 → energy = 60 + (60/60)*40 = 100
    const state = computePetState(makeInput({ weeklyUtilization: 60, fiveHourUtilization: 0 }), prev);
    // happiness: 80 - 2 + 3 = 81 (> 70), energy: 100 (> 50) → playful
    expect(state.mood).toBe('playful');
  });

  // deriveMood: energy < 30 → sleepy
  it('low energy → sleepy', () => {
    const prev = { ...DEFAULT_PET_STATE, hunger: 50, happiness: 50, energy: 20 };
    // fiveHourUtilization 95 → energy = 30 - ((95-90)/10)*20 = 30 - 10 = 20 (clamped 10-30)
    const state = computePetState(makeInput({ weeklyUtilization: 50, fiveHourUtilization: 95 }), prev);
    expect(state.mood).toBe('sleepy');
  });

  // deriveMood: hunger > 70 → worried
  it('high hunger → worried', () => {
    const prev = { ...DEFAULT_PET_STATE, hunger: 90, happiness: 50, energy: 50 };
    // weeklyUtilization < 20 adds 10 to hunger → stays high; energy neutral
    const state = computePetState(makeInput({ weeklyUtilization: 10, fiveHourUtilization: 30 }), prev);
    // hunger: 90 + 10 = 100, happiness: 50-2 = 48, energy ~84 → hunger > 70 → worried
    expect(state.mood).toBe('worried');
  });

  // deriveMood: happiness < 30 && energy < 40 → bored
  it('low happiness + low energy → bored', () => {
    const prev = { ...DEFAULT_PET_STATE, hunger: 50, happiness: 20, energy: 30 };
    // fiveHourUtilization 80 → energy = 60 - ((80-60)/30)*30 = 60 - 20 = 40
    // Need energy < 40, so use higher fiveHour. At 90: energy = 60-30 = 30
    const state = computePetState(
      makeInput({ weeklyUtilization: 10, fiveHourUtilization: 90 }),
      prev,
    );
    // hunger: 50+10=60, happiness: 20-2=18 (<30), energy: 30 (<40) → bored
    expect(state.mood).toBe('bored');
  });
});

// ---------------------------------------------------------------------------
// 3. Event effects (within 5 minutes)
// ---------------------------------------------------------------------------

describe('computePetState – event effects', () => {
  it('feed event (recent) decreases hunger', () => {
    const prev = { ...DEFAULT_PET_STATE, hunger: 60, happiness: 50, energy: 50 };
    const withoutEvent = computePetState(makeInput({ weeklyUtilization: 50, fiveHourUtilization: 30 }), prev);
    const withEvent = computePetState(
      makeInput({ weeklyUtilization: 50, fiveHourUtilization: 30 }),
      prev,
      recentEvent('feed'),
    );
    // feed reduces hunger by 30
    expect(withEvent.hunger).toBe(Math.max(0, withoutEvent.hunger - 30));
  });

  it('play event (recent) increases happiness', () => {
    const prev = { ...DEFAULT_PET_STATE, hunger: 50, happiness: 50, energy: 50 };
    const withoutEvent = computePetState(makeInput({ weeklyUtilization: 50, fiveHourUtilization: 30 }), prev);
    const withEvent = computePetState(
      makeInput({ weeklyUtilization: 50, fiveHourUtilization: 30 }),
      prev,
      recentEvent('play'),
    );
    // play adds 25 to happiness
    expect(withEvent.happiness).toBe(Math.min(100, withoutEvent.happiness + 25));
  });

  it('pet event (recent) gives small recovery on all stats', () => {
    const prev = { ...DEFAULT_PET_STATE, hunger: 50, happiness: 50, energy: 50 };
    const withoutEvent = computePetState(makeInput({ weeklyUtilization: 50, fiveHourUtilization: 30 }), prev);
    const withEvent = computePetState(
      makeInput({ weeklyUtilization: 50, fiveHourUtilization: 30 }),
      prev,
      recentEvent('pet'),
    );
    // pet: hunger -10, happiness +10, energy +10
    expect(withEvent.hunger).toBe(Math.max(0, withoutEvent.hunger - 10));
    expect(withEvent.happiness).toBe(Math.min(100, withoutEvent.happiness + 10));
    expect(withEvent.energy).toBe(Math.min(100, withoutEvent.energy + 10));
  });

  it('old event (>5 min ago) has no effect on stats', () => {
    const prev = { ...DEFAULT_PET_STATE, hunger: 50, happiness: 50, energy: 50 };
    const withoutEvent = computePetState(makeInput({ weeklyUtilization: 50, fiveHourUtilization: 30 }), prev);
    const withOldEvent = computePetState(
      makeInput({ weeklyUtilization: 50, fiveHourUtilization: 30 }),
      prev,
      oldEvent('feed'),
    );
    expect(withOldEvent.hunger).toBe(withoutEvent.hunger);
    expect(withOldEvent.happiness).toBe(withoutEvent.happiness);
    expect(withOldEvent.energy).toBe(withoutEvent.energy);
  });

  it('lastEvent is preserved in the returned state', () => {
    const event = recentEvent('play');
    const state = computePetState(makeInput(), DEFAULT_PET_STATE, event);
    expect(state.lastEvent).toEqual(event);
  });

  it('lastEvent is null when not provided', () => {
    const state = computePetState(makeInput(), DEFAULT_PET_STATE);
    expect(state.lastEvent).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Growth system
// ---------------------------------------------------------------------------

describe('computePetState – growth system', () => {
  it('exp < 100 → baby', () => {
    const prev = { ...DEFAULT_PET_STATE, exp: 0 };
    const state = computePetState(makeInput({ weeklyUtilization: 50 }), prev);
    expect(state.growthStage).toBe('baby');
    expect(state.level).toBe(1);
  });

  it('exp 100-499 → teen', () => {
    const prev = { ...DEFAULT_PET_STATE, exp: 100, growthStage: 'teen' as const, level: 2 };
    const state = computePetState(makeInput({ weeklyUtilization: 50 }), prev);
    expect(state.growthStage).toBe('teen');
    expect(state.level).toBe(2);
  });

  it('exp >= 500 → adult', () => {
    const prev = { ...DEFAULT_PET_STATE, exp: 500, growthStage: 'adult' as const, level: 3 };
    const state = computePetState(makeInput({ weeklyUtilization: 50 }), prev);
    expect(state.growthStage).toBe('adult');
    expect(state.level).toBe(3);
  });

  it('polling with utilization > 0 adds 1 exp', () => {
    const prev = { ...DEFAULT_PET_STATE, exp: 10 };
    const state = computePetState(makeInput({ weeklyUtilization: 50 }), prev);
    // no recent event → +1 exp from utilization > 0
    expect(state.exp).toBe(11);
  });

  it('polling with utilization === 0 adds 0 exp from utilization', () => {
    const prev = { ...DEFAULT_PET_STATE, exp: 10 };
    const state = computePetState(makeInput({ weeklyUtilization: 0 }), prev);
    expect(state.exp).toBe(10);
  });

  it('recent event adds 5 exp (plus utilization bonus)', () => {
    const prev = { ...DEFAULT_PET_STATE, exp: 10 };
    const state = computePetState(makeInput({ weeklyUtilization: 50 }), prev, recentEvent('feed'));
    // utilization > 0 → +1, recent event → +5, total +6
    expect(state.exp).toBe(16);
  });

  it('exp accumulates across the baby-teen threshold', () => {
    const prev = { ...DEFAULT_PET_STATE, exp: 98 };
    const state = computePetState(makeInput({ weeklyUtilization: 50 }), prev, recentEvent('play'));
    // +1 (util) + 5 (event) = +6 → 104 → teen
    expect(state.exp).toBe(104);
    expect(state.growthStage).toBe('teen');
    expect(state.level).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 5. State persistence
// ---------------------------------------------------------------------------

describe('computePetState – state persistence', () => {
  it('previous state values are used as starting point', () => {
    const prev = { ...DEFAULT_PET_STATE, hunger: 80, happiness: 30, energy: 40, exp: 200, level: 2, growthStage: 'teen' as const };
    const state = computePetState(makeInput({ weeklyUtilization: 10, fiveHourUtilization: 30 }), prev);
    // hunger: 80 + 10 = 90 (util < 20), not default 50
    expect(state.hunger).toBe(90);
    // happiness: 30 - 2 = 28 (util < 30 so no boost), not default 50
    expect(state.happiness).toBe(28);
  });

  it('stats are clamped to 0-100 range (hunger upper bound)', () => {
    const prev = { ...DEFAULT_PET_STATE, hunger: 95 };
    // weeklyUtilization < 20 adds 10 → would be 105, clamped to 100
    const state = computePetState(makeInput({ weeklyUtilization: 10 }), prev);
    expect(state.hunger).toBeLessThanOrEqual(100);
    expect(state.hunger).toBeGreaterThanOrEqual(0);
  });

  it('stats are clamped to 0-100 range (hunger lower bound)', () => {
    const prev = { ...DEFAULT_PET_STATE, hunger: 3 };
    // weeklyUtilization > 50 subtracts 5 → would be -2, clamped to 0
    const state = computePetState(makeInput({ weeklyUtilization: 60 }), prev);
    expect(state.hunger).toBe(0);
  });

  it('stats are clamped to 0-100 range (happiness lower bound)', () => {
    const prev = { ...DEFAULT_PET_STATE, happiness: 1 };
    // happiness: 1 - 2 = -1, clamped to 0 (util ≤ 30, no boost)
    const state = computePetState(makeInput({ weeklyUtilization: 10 }), prev);
    expect(state.happiness).toBe(0);
  });

  it('NO_CREDENTIALS preserves previous stats in the returned state', () => {
    const prev = { ...DEFAULT_PET_STATE, hunger: 70, happiness: 30, exp: 150, level: 2, growthStage: 'teen' as const };
    const state = computePetState(makeInput({ error: 'NO_CREDENTIALS' }), prev);
    expect(state.hunger).toBe(70);
    expect(state.happiness).toBe(30);
    expect(state.exp).toBe(150);
    expect(state.growthStage).toBe('teen');
  });

  it('dataSource and stale fields are passed through', () => {
    const state = computePetState(
      makeInput({ weeklyUtilization: 50, dataSource: 'jsonl', stale: true }),
      DEFAULT_PET_STATE,
    );
    expect(state.dataSource).toBe('jsonl');
    expect(state.stale).toBe(true);
  });

  it('resetsAt and fiveHourResetsAt are passed through', () => {
    const resetsAt = '2026-04-01T00:00:00Z';
    const fiveHourResetsAt = '2026-03-17T05:00:00Z';
    const state = computePetState(
      makeInput({ weeklyUtilization: 50, resetsAt, fiveHourResetsAt }),
      DEFAULT_PET_STATE,
    );
    expect(state.resetsAt).toBe(resetsAt);
    expect(state.fiveHourResetsAt).toBe(fiveHourResetsAt);
  });
});
