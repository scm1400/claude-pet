import { BadgeEntry } from '../shared/types';

export const BADGE_REGISTRY: BadgeEntry[] = [
  {
    id: 'badge_first_call',
    tier: 'bronze',
    name: { ko: '첫 걸음', en: 'First Steps', ja: '初めの一歩', zh: '第一步' },
    description: { ko: '첫 API 호출', en: 'First API call', ja: '初めてのAPI呼び出し', zh: '第一次API调用' },
    icon: '👣',
  },
  {
    id: 'badge_streak_3',
    tier: 'bronze',
    name: { ko: '3일 연속', en: '3-Day Streak', ja: '3日連続', zh: '3天连续' },
    description: { ko: '3일 연속 사용', en: '3 consecutive days of usage', ja: '3日連続使用', zh: '连续使用3天' },
    icon: '🔥',
  },
  {
    id: 'badge_mama_7days',
    tier: 'bronze',
    name: { ko: '엄마와 7일', en: '7 Days with Mom', ja: 'ママと7日', zh: '和妈妈的7天' },
    description: { ko: '설치 후 7일 경과', en: '7 days since install', ja: 'インストールから7日', zh: '安装后7天' },
    icon: '🏠',
  },
  {
    id: 'badge_half',
    tier: 'silver',
    name: { ko: '반타작', en: 'Halfway There', ja: '半分達成', zh: '半程达成' },
    description: { ko: '주간 50% 달성', en: 'Reach 50% weekly usage', ja: '週間50%達成', zh: '周使用率达到50%' },
    icon: '⚡',
  },
  {
    id: 'badge_streak_7',
    tier: 'silver',
    name: { ko: '7일 연속', en: '7-Day Streak', ja: '7日連続', zh: '7天连续' },
    description: { ko: '7일 연속 사용', en: '7 consecutive days of usage', ja: '7日連続使用', zh: '连续使用7天' },
    icon: '💪',
  },
  {
    id: 'badge_proud_10',
    tier: 'silver',
    name: { ko: '자랑스러운 아들', en: "Mom's Pride", ja: 'ママの誇り', zh: '妈妈的骄傲' },
    description: { ko: 'proud 상태 10회 달성', en: 'Reach proud mood 10 times', ja: 'proud状態10回達成', zh: '达到proud状态10次' },
    icon: '🏆',
  },
  {
    id: 'badge_full',
    tier: 'gold',
    name: { ko: '풀 가동', en: 'Full Power', ja: 'フル稼働', zh: '全力运转' },
    description: { ko: '주간 100% 달성', en: 'Reach 100% weekly usage', ja: '週間100%達成', zh: '周使用率达到100%' },
    icon: '🚀',
  },
  {
    id: 'badge_streak_30',
    tier: 'gold',
    name: { ko: '30일 연속', en: '30-Day Streak', ja: '30日連続', zh: '30天连续' },
    description: { ko: '30일 연속 사용', en: '30 consecutive days of usage', ja: '30日連続使用', zh: '连续使用30天' },
    icon: '👑',
  },
  {
    id: 'badge_survivor',
    tier: 'gold',
    name: { ko: '생존왕', en: 'Survivor', ja: 'サバイバー', zh: '生存王' },
    description: { ko: 'angry 10회 경험 후 계속 사용', en: 'Keep using after 10 angry moods', ja: 'angry10回経験後も使い続ける', zh: '经历10次angry后继续使用' },
    icon: '🛡️',
  },
];

export function getBadgeById(id: string): BadgeEntry | undefined {
  return BADGE_REGISTRY.find((b) => b.id === id);
}
