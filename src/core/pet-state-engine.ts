import { PetState, PetMood, PetErrorExpression, PetEvent, Locale } from '../shared/types';
import { getMessage } from './pet-messages';
import { DEFAULT_LOCALE } from '../shared/i18n';

type GrowthStage = 'baby' | 'teen' | 'adult';

export interface UsageInput {
  weeklyUtilization: number | null;
  fiveHourUtilization: number | null;
  error: string | null;
  resetsAt?: string | null;
  fiveHourResetsAt?: string | null;
  dataSource?: 'api' | 'jsonl' | 'none';
  stale?: boolean;
  rateLimited?: boolean;
  locale?: Locale;
}

interface PreviousPetState {
  hunger: number;
  happiness: number;
  energy: number;
  exp: number;
  level: number;
  growthStage: GrowthStage;
}

export const DEFAULT_PET_STATE: PreviousPetState = {
  hunger: 50,
  happiness: 50,
  energy: 50,
  exp: 0,
  level: 1,
  growthStage: 'baby',
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isEventRecent(event: PetEvent): boolean {
  const fiveMinMs = 5 * 60 * 1000;
  return Date.now() - new Date(event.timestamp).getTime() < fiveMinMs;
}

function deriveMood(hunger: number, happiness: number, energy: number): PetMood {
  if (hunger < 30 && happiness > 60 && energy > 40) return 'happy';
  if (happiness > 70 && energy > 50) return 'playful';
  if (energy < 30) return 'sleepy';
  if (hunger > 70) return 'worried';
  if (happiness < 30 && energy < 40) return 'bored';
  return 'happy';
}

function deriveGrowthStage(exp: number): GrowthStage {
  if (exp >= 500) return 'adult';
  if (exp >= 100) return 'teen';
  return 'baby';
}

/**
 * Pure function: derives PetState from usage data, previous pet state, and events.
 * No Electron imports. No side effects.
 */
export function computePetState(
  input: UsageInput,
  prev: PreviousPetState,
  lastEvent?: PetEvent | null,
): PetState {
  const {
    weeklyUtilization,
    fiveHourUtilization,
    error,
    resetsAt = null,
    fiveHourResetsAt = null,
    dataSource = 'none',
    stale = false,
    rateLimited = false,
    locale = DEFAULT_LOCALE,
  } = input;

  const basePetFields = {
    hunger: prev.hunger,
    happiness: prev.happiness,
    energy: prev.energy,
    exp: prev.exp,
    level: prev.level,
    growthStage: prev.growthStage,
    lastEvent: lastEvent ?? null,
  };

  // No credentials → sleeping
  if (error === 'NO_CREDENTIALS') {
    return {
      mood: 'sleeping' as PetErrorExpression,
      utilizationPercent: 0,
      fiveHourPercent: null,
      message: getMessage('sleeping', locale),
      resetsAt: null,
      fiveHourResetsAt: null,
      dataSource: 'none',
      stale: false,
      rateLimited: false,
      error,
      ...basePetFields,
    };
  }

  // Rate limited — if we have utilization data, derive mood; otherwise confused
  if (rateLimited) {
    if (weeklyUtilization !== null) {
      let rlMood: PetMood;
      if (weeklyUtilization < 20) rlMood = 'worried';
      else if (weeklyUtilization < 50) rlMood = 'bored';
      else if (weeklyUtilization < 85) rlMood = 'happy';
      else rlMood = 'playful';

      return {
        mood: rlMood,
        utilizationPercent: weeklyUtilization,
        fiveHourPercent: fiveHourUtilization,
        message: getMessage('rateLimited', locale),
        resetsAt,
        fiveHourResetsAt,
        dataSource,
        stale,
        rateLimited: true,
        error,
        ...basePetFields,
      };
    }
    return {
      mood: 'confused' as PetErrorExpression,
      utilizationPercent: 0,
      fiveHourPercent: fiveHourUtilization,
      message: getMessage('rateLimited', locale),
      resetsAt,
      fiveHourResetsAt,
      dataSource,
      stale,
      rateLimited: true,
      error,
      ...basePetFields,
    };
  }

  // API error / null data → confused
  if (error !== null || weeklyUtilization === null) {
    return {
      mood: 'confused' as PetErrorExpression,
      utilizationPercent: 0,
      fiveHourPercent: fiveHourUtilization,
      message: getMessage('confused', locale),
      resetsAt,
      fiveHourResetsAt,
      dataSource,
      stale,
      rateLimited: false,
      error,
      ...basePetFields,
    };
  }

  // --- State derivation from usage ---

  // Hunger: well-fed by coding (high util) or hungry (low util)
  let hunger = prev.hunger;
  if (weeklyUtilization > 50) {
    hunger -= 5;
  } else if (weeklyUtilization < 20) {
    hunger += 10;
  }
  hunger = clamp(hunger, 0, 100);

  // Happiness: decays each poll, boosted by usage
  let happiness = prev.happiness - 2;
  if (weeklyUtilization > 30) {
    happiness += 3;
  }
  happiness = clamp(happiness, 0, 100);

  // Energy: derived from 5-hour utilization
  let energy: number;
  if (fiveHourUtilization !== null) {
    if (fiveHourUtilization <= 60) {
      // 0-60% → high energy 60-100
      energy = 60 + ((60 - fiveHourUtilization) / 60) * 40;
    } else if (fiveHourUtilization <= 90) {
      // 60-90% → moderate 30-60
      energy = 60 - ((fiveHourUtilization - 60) / 30) * 30;
    } else {
      // >90% → tired 10-30
      energy = 30 - ((fiveHourUtilization - 90) / 10) * 20;
      energy = clamp(energy, 10, 30);
    }
  } else {
    energy = 50;
  }

  // --- Event effects ---
  const recentEvent = lastEvent && isEventRecent(lastEvent);
  if (recentEvent && lastEvent) {
    switch (lastEvent.type) {
      case 'feed':
        hunger = clamp(hunger - 30, 0, 100);
        break;
      case 'play':
        happiness = clamp(happiness + 25, 0, 100);
        break;
      case 'pet':
        hunger = clamp(hunger - 10, 0, 100);
        happiness = clamp(happiness + 10, 0, 100);
        energy = clamp(energy + 10, 0, 100);
        break;
    }
  }

  // --- Mood derivation ---
  let mood: PetMood | PetErrorExpression;
  if (recentEvent && lastEvent) {
    // For event reactions, derive mood from event type but use special message keys
    mood = deriveMood(hunger, happiness, energy);
  } else {
    mood = deriveMood(hunger, happiness, energy);
  }

  // --- Growth ---
  const expGain = (weeklyUtilization > 0 ? 1 : 0) + (recentEvent ? 5 : 0);
  const exp = prev.exp + expGain;
  const growthStage = deriveGrowthStage(exp);
  // Level: simple mapping from growth stage
  const level = growthStage === 'baby' ? 1 : growthStage === 'teen' ? 2 : 3;

  // --- Message ---
  let messageKey: string;
  if (recentEvent && lastEvent) {
    switch (lastEvent.type) {
      case 'feed':
        messageKey = 'eating';
        break;
      case 'play':
        messageKey = 'playing';
        break;
      case 'pet':
        messageKey = 'petted';
        break;
      default:
        messageKey = mood;
    }
  } else {
    messageKey = mood;
  }
  const message = getMessage(messageKey as Parameters<typeof getMessage>[0], locale);

  return {
    mood,
    hunger,
    happiness,
    energy,
    exp,
    level,
    growthStage,
    utilizationPercent: weeklyUtilization,
    fiveHourPercent: fiveHourUtilization,
    message,
    resetsAt,
    fiveHourResetsAt,
    dataSource,
    stale,
    rateLimited: false,
    error: null,
    lastEvent: lastEvent ?? null,
  };
}
