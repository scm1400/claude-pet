import { BadgeEntry } from '../shared/types';

export const BADGE_REGISTRY: BadgeEntry[] = [
  {
    id: 'badge_first_call',
    tier: 'bronze',
    name: { ko: '첫 만남', en: 'First Meeting', ja: '初めまして', zh: '初次见面' },
    description: { ko: '첫 API 호출', en: 'First API call', ja: '初めてのAPI呼び出し', zh: '第一次API调用' },
    icon: '🐾',
  },
  {
    id: 'badge_streak_3',
    tier: 'bronze',
    name: { ko: '3일 함께', en: '3 Days Together', ja: '3日一緒', zh: '3天陪伴' },
    description: { ko: '3일 연속 사용', en: '3 consecutive days', ja: '3日連続使用', zh: '连续使用3天' },
    icon: '🔥',
  },
  {
    id: 'badge_7days',
    tier: 'bronze',
    name: { ko: '일주일 친구', en: 'Week-long Buddy', ja: '一週間の仲間', zh: '一周好友' },
    description: { ko: '설치 후 7일', en: '7 days since install', ja: 'インストールから7日', zh: '安装后7天' },
    icon: '🏠',
  },
  {
    id: 'badge_half',
    tier: 'silver',
    name: { ko: '반타작', en: 'Halfway There', ja: '半分達成', zh: '半程达成' },
    description: { ko: '주간 50% 달성', en: 'Reach 50% weekly', ja: '週間50%達成', zh: '周使用率50%' },
    icon: '⚡',
  },
  {
    id: 'badge_streak_7',
    tier: 'silver',
    name: { ko: '7일 연속', en: '7-Day Streak', ja: '7日連続', zh: '7天连续' },
    description: { ko: '7일 연속 사용', en: '7 consecutive days', ja: '7日連続使用', zh: '连续使用7天' },
    icon: '💪',
  },
  {
    id: 'badge_happy_10',
    tier: 'silver',
    name: { ko: '꼬리흔들기 달인', en: 'Tail Wag Master', ja: 'しっぽ振り名人', zh: '摇尾达人' },
    description: { ko: 'happy 상태 10회', en: 'Happy mood 10 times', ja: 'happy状態10回', zh: 'happy状态10次' },
    icon: '🏆',
  },
  {
    id: 'badge_full',
    tier: 'gold',
    name: { ko: '풀 가동', en: 'Full Power', ja: 'フル稼働', zh: '全力运转' },
    description: { ko: '주간 100% 달성', en: 'Reach 100% weekly', ja: '週間100%達成', zh: '周使用率100%' },
    icon: '🚀',
  },
  {
    id: 'badge_streak_30',
    tier: 'gold',
    name: { ko: '30일 동반자', en: '30-Day Companion', ja: '30日の相棒', zh: '30天伙伴' },
    description: { ko: '30일 연속 사용', en: '30 consecutive days', ja: '30日連続使用', zh: '连续使用30天' },
    icon: '👑',
  },
  {
    id: 'badge_survivor',
    tier: 'gold',
    name: { ko: '충실한 친구', en: 'Loyal Companion', ja: '忠実な友', zh: '忠实伙伴' },
    description: { ko: 'worried 10회 후에도 사용', en: 'Keep using after 10 worried moods', ja: 'worried10回後も使い続ける', zh: '经历10次worried后继续' },
    icon: '🛡️',
  },
];

export function getBadgeById(id: string): BadgeEntry | undefined {
  return BADGE_REGISTRY.find((b) => b.id === id);
}
