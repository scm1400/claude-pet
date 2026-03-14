import { BadgeTriggerContext } from '../shared/types';

export function evaluateBadgeTriggers(ctx: BadgeTriggerContext): string[] {
  const triggered: string[] = [];
  const { weeklyUtilization, dailyHistory, installDate, firstApiCallSeen, now, proudCount, angryCount } = ctx;

  // Bronze: first call
  if (!firstApiCallSeen && weeklyUtilization !== null && weeklyUtilization > 0) {
    triggered.push('badge_first_call');
  }

  // Streak calculation
  if (dailyHistory.length > 0) {
    const sorted = [...dailyHistory].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    for (const d of sorted) {
      if (d.percent > 0) streak++;
      else break;
    }
    if (streak >= 3) triggered.push('badge_streak_3');
    if (streak >= 7) triggered.push('badge_streak_7');
    if (streak >= 30) triggered.push('badge_streak_30');
  }

  // Days since install
  const installDt = new Date(installDate);
  const daysSince = Math.floor((now.getTime() - installDt.getTime()) / (24 * 60 * 60 * 1000));
  if (daysSince >= 7) triggered.push('badge_mama_7days');

  // Usage milestones
  if (weeklyUtilization !== null && weeklyUtilization >= 50) triggered.push('badge_half');
  if (weeklyUtilization !== null && weeklyUtilization >= 100) triggered.push('badge_full');

  // Mood counts
  if (proudCount >= 10) triggered.push('badge_proud_10');
  if (angryCount >= 10 && weeklyUtilization !== null && weeklyUtilization > 0) {
    triggered.push('badge_survivor');
  }

  return triggered;
}
