import { MamaState, Locale } from '../shared/types';
import { getMessage } from './messages';

export interface UsageInput {
  weeklyUtilization: number | null;
  fiveHourUtilization: number | null;
  error: string | null;
  resetsAt?: string | null;
  fiveHourResetsAt?: string | null;
  dataSource?: 'api' | 'cache' | 'none';
  stale?: boolean;
  locale?: Locale;
}

/**
 * Pure function: derives MamaState from raw usage inputs.
 * No Electron imports. No side effects.
 */
export function computeMood(input: UsageInput): MamaState {
  const {
    weeklyUtilization,
    fiveHourUtilization,
    error,
    resetsAt = null,
    fiveHourResetsAt = null,
    dataSource = 'none',
    stale = false,
    locale = 'ko',
  } = input;

  // No credentials → sleeping
  if (error === 'NO_CREDENTIALS') {
    return {
      mood: 'sleeping',
      utilizationPercent: 0,
      fiveHourPercent: null,
      message: getMessage('sleeping', locale),
      resetsAt: null,
      fiveHourResetsAt: null,
      dataSource: 'none',
      stale: false,
      error,
    };
  }

  // API error / null data → confused
  if (error !== null || weeklyUtilization === null) {
    return {
      mood: 'confused',
      utilizationPercent: 0,
      fiveHourPercent: fiveHourUtilization,
      message: getMessage('confused', locale),
      resetsAt,
      fiveHourResetsAt,
      dataSource,
      stale,
      error,
    };
  }

  // Determine base mood from weekly utilization thresholds
  let mood: MamaState['mood'];
  if (weeklyUtilization < 15) {
    mood = 'angry';
  } else if (weeklyUtilization < 50) {
    mood = 'worried';
  } else if (weeklyUtilization < 85) {
    mood = 'happy';
  } else {
    mood = 'proud';
  }

  // 5-hour override: if fiveHourUtilization > 90, emit warning message
  const hasFiveHourWarning =
    fiveHourUtilization !== null && fiveHourUtilization > 90;

  const message = hasFiveHourWarning
    ? getMessage('fiveHourWarning', locale)
    : getMessage(mood, locale);

  return {
    mood,
    utilizationPercent: weeklyUtilization,
    fiveHourPercent: fiveHourUtilization,
    message,
    resetsAt,
    fiveHourResetsAt,
    dataSource,
    stale,
    error: null,
  };
}
