import { QuoteEntry, Locale } from '../shared/types';
import { MESSAGE_POOLS } from './pet-messages';

function generateCommonQuotes(): QuoteEntry[] {
  const moods = ['happy', 'playful', 'sleepy', 'worried', 'bored', 'confused', 'sleeping', 'fiveHourWarning'] as const;

  const quotes: QuoteEntry[] = [];

  for (const mood of moods) {
    const pool = MESSAGE_POOLS.ko[mood];
    for (let i = 0; i < pool.length; i++) {
      quotes.push({
        id: `common_${mood}_${i}`,
        rarity: 'common',
        messages: {
          ko: MESSAGE_POOLS.ko[mood][i],
          en: MESSAGE_POOLS.en[mood][i],
          ja: MESSAGE_POOLS.ja[mood][i],
          zh: MESSAGE_POOLS.zh[mood][i],
        } as Record<Locale, string>,
        moodSource: { mood, index: i },
      });
    }
  }

  return quotes;
}

const RARE_QUOTES: QuoteEntry[] = [
  {
    id: 'rare_exact0',
    rarity: 'rare',
    messages: {
      ko: '한 번도 안 놀아줬어...? 심심해...',
      en: "You haven't played with me at all...? I'm bored...",
      ja: '一回も遊んでくれないの...？退屈...',
      zh: '一次都没陪我玩过...？好无聊...',
    },
  },
  {
    id: 'rare_5h_100',
    rarity: 'rare',
    messages: {
      ko: '주인! 너무 무리하고 있어! 쉬어!',
      en: "You're overdoing it! Take a break!",
      ja: '頑張りすぎだよ！休んで！',
      zh: '太拼了！快休息！',
    },
  },
  {
    id: 'rare_spike',
    rarity: 'rare',
    messages: {
      ko: '갑자기 엄청 열심히 하네?! 나도 신나!',
      en: "Suddenly working so hard?! I'm excited too!",
      ja: '急に頑張ってる？！ぼくも嬉しい！',
      zh: '突然这么努力！我也好兴奋！',
    },
  },
  {
    id: 'rare_exact50',
    rarity: 'rare',
    messages: {
      ko: '딱 반이다... 나머지 반도 화이팅!',
      en: 'Exactly half... keep going for the other half!',
      ja: 'ちょうど半分... 残り半分もファイト！',
      zh: '刚好一半... 另一半也加油！',
    },
  },
  {
    id: 'rare_night_owl',
    rarity: 'rare',
    messages: {
      ko: '이 시간에 아직?! 나도 눈 감겨... 같이 자자...',
      en: "Still up?! I'm getting sleepy too... let's sleep...",
      ja: 'まだ起きてるの？！ぼくも眠い... 一緒に寝よう...',
      zh: '还没睡？！我也困了... 一起睡吧...',
    },
  },
];

const LEGENDARY_QUOTES: QuoteEntry[] = [
  {
    id: 'legendary_7day_streak',
    rarity: 'legendary',
    messages: {
      ko: '7일 연속이야! 우리 정말 찰떡궁합이다!',
      en: "7 days in a row! We're the perfect team!",
      ja: '7日連続だよ！最高のコンビだね！',
      zh: '连续7天！我们真是最佳搭档！',
    },
  },
  {
    id: 'legendary_first_call',
    rarity: 'legendary',
    messages: {
      ko: '드디어 같이 코딩이다! 신난다~!',
      en: 'Finally coding together! So exciting~!',
      ja: 'やっと一緒にコーディング！楽しみ〜！',
      zh: '终于一起写代码了！好开心~！',
    },
  },
  {
    id: 'legendary_99plus',
    rarity: 'legendary',
    messages: {
      ko: '주인이 이렇게 대단한 사람이었어...! 존경해!',
      en: "I didn't know you were this amazing...! I look up to you!",
      ja: 'こんなにすごい人だったんだ...！尊敬する！',
      zh: '没想到你这么厉害...！好崇拜！',
    },
  },
];

const SECRET_QUOTES: QuoteEntry[] = [
  {
    id: 'secret_newyear',
    rarity: 'secret',
    messages: {
      ko: '새해에도 코딩?! 대단해! 새해 복 많이 받아~',
      en: 'Coding on New Year?! Amazing! Happy New Year~',
      ja: 'お正月にもコーディング？！すごい！明けましておめでとう〜',
      zh: '新年也在写代码?！厉害！新年快乐~',
    },
  },
  {
    id: 'secret_chuseok',
    rarity: 'secret',
    messages: {
      ko: '추석에도 같이 있어줘서 고마워~ 송편 먹고 싶다!',
      en: 'Thanks for being with me on Chuseok~ I want songpyeon!',
      ja: '秋夕にも一緒にいてくれてありがとう〜ソンピョン食べたい！',
      zh: '中秋也陪着我谢谢~ 好想吃月饼！',
    },
  },
  {
    id: 'secret_christmas',
    rarity: 'secret',
    messages: {
      ko: '메리 크리스마스! 주인이 최고의 선물이야!',
      en: "Merry Christmas! You're the best gift ever!",
      ja: 'メリークリスマス！あなたが最高のプレゼント！',
      zh: '圣诞快乐！你就是最好的礼物！',
    },
  },
  {
    id: 'secret_100days',
    rarity: 'secret',
    messages: {
      ko: '100일 기념! 우리 앞으로도 쭉 함께하자!',
      en: "100 days! Let's stay together forever!",
      ja: '100日記念！これからもずっと一緒にいようね！',
      zh: '100天纪念！我们永远在一起吧！',
    },
  },
  {
    id: 'secret_3am',
    rarity: 'secret',
    messages: {
      ko: '새벽 3시...?! 자자자 제발 자자...!',
      en: '3 AM...?! Sleep sleep please sleep...!',
      ja: '午前3時...?！寝て寝てお願い寝て...！',
      zh: '凌晨3点...?！快睡快睡求你快睡...！',
    },
  },
];

export const QUOTE_REGISTRY: QuoteEntry[] = [
  ...generateCommonQuotes(),
  ...RARE_QUOTES,
  ...LEGENDARY_QUOTES,
  ...SECRET_QUOTES,
];

export function getQuoteById(id: string): QuoteEntry | undefined {
  return QUOTE_REGISTRY.find((q) => q.id === id);
}

export function getQuotesByRarity(rarity: QuoteEntry['rarity']): QuoteEntry[] {
  return QUOTE_REGISTRY.filter((q) => q.rarity === rarity);
}
