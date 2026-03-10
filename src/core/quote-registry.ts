import { QuoteEntry, Locale } from '../shared/types';
import { MESSAGE_POOLS } from './messages';

function generateCommonQuotes(): QuoteEntry[] {
  const moods = [
    'angry',
    'worried',
    'happy',
    'proud',
    'confused',
    'sleeping',
    'fiveHourWarning',
  ] as const;

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
      ko: '한 번도 안 쓴 거야? 비싼 돈 내고?',
      en: "You haven't used it at ALL? After paying good money?",
      ja: '一度も使ってないの？高いお金払ってるのに？',
      zh: '一次都没用过？花了那么多钱？',
    },
  },
  {
    id: 'rare_5h_100',
    rarity: 'rare',
    messages: {
      ko: '쉬어!! 손목 부러진다!!',
      en: 'STOP!! Your wrists are going to break!!',
      ja: '休んで！！手首が折れるわよ！！',
      zh: '休息！！手腕要断了！！',
    },
  },
  {
    id: 'rare_spike',
    rarity: 'rare',
    messages: {
      ko: '갑자기 열심히 하니까 더 무섭다',
      en: 'You suddenly working hard is even scarier',
      ja: '急に頑張り出すと余計怖いわ',
      zh: '突然这么努力反而更可怕了',
    },
  },
  {
    id: 'rare_exact50',
    rarity: 'rare',
    messages: {
      ko: '딱 반이네... 반만 하는 게 어딨어',
      en: 'Exactly half... who does things halfway?',
      ja: 'ちょうど半分ね... 中途半端はダメよ',
      zh: '刚好一半...做事哪有做一半的',
    },
  },
  {
    id: 'rare_night_owl',
    rarity: 'rare',
    messages: {
      ko: '이 시간에 아직도 코딩하냐?! 잠 좀 자!!',
      en: 'Still coding at this hour?! Go to sleep!!',
      ja: 'こんな時間にまだコーディング？！寝なさい！！',
      zh: '这个点还在写代码？！快去睡觉！！',
    },
  },
];

const LEGENDARY_QUOTES: QuoteEntry[] = [
  {
    id: 'legendary_7day_streak',
    rarity: 'legendary',
    messages: {
      ko: '우리 아들이 달라졌어... (눈물)',
      en: 'My kid has changed... (tears)',
      ja: 'うちの子が変わった... (涙)',
      zh: '我家孩子变了... (泪)',
    },
  },
  {
    id: 'legendary_first_call',
    rarity: 'legendary',
    messages: {
      ko: '첫 걸음마 뗐구나~ 엄마가 봤어',
      en: 'Your first steps~ Mom saw it all',
      ja: '初めての一歩ね〜ママ見てたわよ',
      zh: '迈出第一步了~ 妈妈都看到了',
    },
  },
  {
    id: 'legendary_99plus',
    rarity: 'legendary',
    messages: {
      ko: '엄마가 아들 잘못 봤다... 진짜 대단하다',
      en: "Mom was wrong about you... you're truly amazing",
      ja: 'ママ、あなたのこと見くびってた... 本当にすごいわ',
      zh: '妈妈看错你了... 真的很了不起',
    },
  },
];

const SECRET_QUOTES: QuoteEntry[] = [
  {
    id: 'secret_newyear',
    rarity: 'secret',
    messages: {
      ko: '명절에도 코딩하냐... 세뱃돈이나 받아라',
      en: 'Coding on a holiday... at least take your lucky money',
      ja: 'お正月にもコーディング... お年玉でももらいなさい',
      zh: '过年还在写代码... 拿压岁钱去吧',
    },
  },
  {
    id: 'secret_chuseok',
    rarity: 'secret',
    messages: {
      ko: '추석에도 코딩이야? 송편이나 먹어!',
      en: 'Coding on Chuseok? Go eat some songpyeon!',
      ja: '秋夕にもコーディング？ソンピョンでも食べなさい！',
      zh: '中秋还在写代码？去吃月饼吧！',
    },
  },
  {
    id: 'secret_christmas',
    rarity: 'secret',
    messages: {
      ko: '산타 말고 엄마가 치킨 시켜줄게',
      en: 'Forget Santa — Mom will order you chicken',
      ja: 'サンタじゃなくてママがチキン頼んであげる',
      zh: '别等圣诞老人了，妈妈给你点炸鸡',
    },
  },
  {
    id: 'secret_100days',
    rarity: 'secret',
    messages: {
      ko: '벌써 100일... 엄마랑 동거 100일째네',
      en: 'Already 100 days... living with Mom for 100 days~',
      ja: 'もう100日... ママとの同居100日目ね',
      zh: '已经100天了... 和妈妈同居100天了呢',
    },
  },
  {
    id: 'secret_3am',
    rarity: 'secret',
    messages: {
      ko: '이 시간에 아직도?! 엄마도 못 자잖아',
      en: "STILL up at this hour?! Mom can't sleep either!",
      ja: 'この時間にまだ？！ママも寝れないじゃない',
      zh: '这个点还没睡？！妈妈也睡不着了',
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
