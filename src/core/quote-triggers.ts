import { TriggerContext } from '../shared/types';

/** Korean lunar holiday dates (Seollal / Chuseok) for 2026-2029. Format: MM-DD. */
const SEOLLAL_DATES = ['02-17', '01-29', '01-26', '02-13']; // 2026-2029
const CHUSEOK_DATES = ['10-04', '09-24', '09-12', '10-01']; // 2026-2029

/**
 * Pure function: given current usage context, returns IDs of all triggered quotes.
 * No side effects. No Electron imports.
 */
export function evaluateQuoteTriggers(
  ctx: TriggerContext,
  currentCommonId?: string,
): string[] {
  const triggered: string[] = [];

  if (currentCommonId) {
    triggered.push(currentCommonId);
  }

  const { weeklyUtilization, fiveHourUtilization, dailyHistory, installDate, firstApiCallSeen, now } = ctx;

  // === RARE ===
  if (weeklyUtilization === 0) triggered.push('rare_exact0');
  if (fiveHourUtilization !== null && fiveHourUtilization >= 100) triggered.push('rare_5h_100');
  if (weeklyUtilization === 50) triggered.push('rare_exact50');

  if (dailyHistory.length >= 2) {
    const sorted = [...dailyHistory].sort((a, b) => b.date.localeCompare(a.date));
    if (sorted[0] && sorted[1] && sorted[0].percent - sorted[1].percent >= 30) {
      triggered.push('rare_spike');
    }
  }

  const hour = now.getHours();
  if (hour >= 1 && hour < 4) triggered.push('rare_night_owl');

  // === LEGENDARY ===
  if (weeklyUtilization !== null && weeklyUtilization >= 99) triggered.push('legendary_99plus');
  if (!firstApiCallSeen && weeklyUtilization !== null && weeklyUtilization > 0) triggered.push('legendary_first_call');

  if (dailyHistory.length >= 7) {
    const sorted = [...dailyHistory].sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.slice(0, 7).every((d) => d.percent >= 80)) triggered.push('legendary_7day_streak');
  }

  // === SECRET ===
  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const year = now.getFullYear();
  const yearIdx = year - 2026;

  if (yearIdx >= 0 && yearIdx < SEOLLAL_DATES.length && mmdd === SEOLLAL_DATES[yearIdx]) triggered.push('secret_newyear');
  if (yearIdx >= 0 && yearIdx < CHUSEOK_DATES.length && mmdd === CHUSEOK_DATES[yearIdx]) triggered.push('secret_chuseok');
  if (now.getMonth() === 11 && now.getDate() === 25) triggered.push('secret_christmas');
  if (hour === 3) triggered.push('secret_3am');

  const installDt = new Date(installDate);
  const installUtcDay = Date.UTC(installDt.getUTCFullYear(), installDt.getUTCMonth(), installDt.getUTCDate());
  const nowUtcDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSinceInstall = Math.floor((nowUtcDay - installUtcDay) / (24 * 60 * 60 * 1000));
  if (daysSinceInstall === 100) triggered.push('secret_100days');

  return triggered;
}
