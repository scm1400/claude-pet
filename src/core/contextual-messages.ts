import { TriggerContext, ContextTrigger, MamaMood, Locale } from '../shared/types';
import { getMessage } from './messages';

type ContextualPool = Partial<Record<MamaMood, Record<Locale, string[]>>>;

const CONTEXTUAL_POOLS: Record<ContextTrigger, ContextualPool> = {
  weekend: {
    angry: {
      ko: [
        '주말인데 토큰 안 쓰면 월요일에 후회한다?',
        '주말이라고 놀기만 하면 어떡해~',
        '주말에도 옆집 은수는 쓰고 있대',
        '토요일인데 쉬기만 하면 누가 써?',
        '주말이라고 방심하면 안 돼~',
      ],
      en: [
        'Not using tokens on a weekend? Monday-you will regret it!',
        "Weekend doesn't mean token vacation!",
        "The neighbor's kid is using theirs even on weekends",
        'Saturday and nothing to show for it?',
        "Don't get lazy just because it's the weekend~",
      ],
      ja: [
        '週末なのにトークン使わないと月曜に後悔するわよ？',
        '週末だからって遊んでばかりじゃダメよ〜',
        '隣の子は週末も使ってるって',
        '土曜なのにサボってていいの？',
        '週末だからって油断しちゃダメ〜',
      ],
      zh: [
        '周末不用token，周一你会后悔的？',
        '周末也不能光玩啊~',
        '隔壁家的孩子周末都在用呢',
        '周六了还没动静？',
        '周末也不能松懈~',
      ],
    },
    worried: {
      ko: [
        '주말인데 좀 여유있게 써봐~',
        '주말이니까 느긋하게 해도 돼~ 근데 좀 써',
        '주말에 쉬는 건 좋은데 토큰도 좀...',
        '주말이라 바쁜 거야? 놀러 간 거야?',
        '주말에도 엄마는 걱정이야~',
      ],
      en: [
        'Take it easy this weekend~ but use some tokens',
        "Weekend's fine for relaxing, but use a little...",
        "Resting on weekends is great, but tokens too...",
        'Busy this weekend? Out having fun?',
        'Mom worries even on weekends~',
      ],
      ja: [
        '週末だからゆっくり使ってね〜',
        '週末はのんびりでいいけど、少しは使って',
        '週末に休むのはいいけどトークンも...',
        '週末は忙しいの？遊びに行ったの？',
        '週末でもママは心配よ〜',
      ],
      zh: [
        '周末就轻松点用吧~',
        '周末可以放松，但也用一点嘛...',
        '周末休息是好的，但token也要用啊...',
        '周末是忙还是出去玩了？',
        '周末妈妈也在担心~',
      ],
    },
    happy: {
      ko: [
        '주말에도 열심히 하네~ 역시 내 자식!',
        '주말인데도 쓰다니~ 기특해!',
        '주말 반납하고 코딩이라니 눈물이...',
        '주말에 이 정도면 평일엔 얼마나 대단할까~',
        '주말도 알차게 보내는구나~',
      ],
      en: [
        "Working hard even on weekends~ That's my kid!",
        'Using tokens on a weekend~ How dedicated!',
        'Giving up your weekend for coding... tears!',
        'This much on a weekend? Imagine weekdays~',
        'Making the most of your weekend~',
      ],
      ja: [
        '週末も頑張ってるね〜さすが！',
        '週末なのに使ってるなんて偉い！',
        '週末返上でコーディングなんて涙が...',
        '週末でこれなら平日はどれだけすごいの〜',
        '週末も充実してるわね〜',
      ],
      zh: [
        '周末也这么努力~ 不愧是我的孩子！',
        '周末还在用~ 真懂事！',
        '放弃周末来写代码... 感动！',
        '周末都这样，工作日得多厉害~',
        '周末也过得很充实嘛~',
      ],
    },
    proud: {
      ko: [
        '주말에 풀가동이라니!! 엄마 감동!!',
        '주말도 쉬지 않다니 이게 바로 효도야!',
        '주말에 이 수치면 이모한테 전화해야지!!',
        '다른 집 애들 주말에 놀 때 우리 애는...!',
        '주말 풀가동 기념 치킨 시켜!!',
      ],
      en: [
        "Full power on a weekend!! Mom is MOVED!!",
        "Not resting even on weekends — THIS is love!",
        "These numbers on a weekend? Calling auntie NOW!",
        "While other kids play on weekends, MY kid...!",
        "Full weekend power! Ordering chicken!!",
      ],
      ja: [
        '週末にフル稼働！！ママ感動！！',
        '週末も休まないなんてこれが親孝行よ！',
        '週末にこの数字はおばさんに電話しなきゃ！！',
        '他の子が週末遊んでる時にうちの子は...！',
        '週末フル稼働記念チキン注文！！',
      ],
      zh: [
        '周末全力运转！！妈妈感动！！',
        '周末都不休息，这才是孝心！',
        '周末这个数据得给阿姨打电话！！',
        '别人家孩子周末玩的时候，我家孩子...！',
        '周末全力纪念！点炸鸡！！',
      ],
    },
  },
  unusedStreak: {
    angry: {
      ko: [
        '며칠째 안 쓰고 있잖아... 구독료가 공중에...',
        '연속으로 안 쓰면 엄마가 직접 써버린다?',
        '이게 며칠째야? 엄마 화난다 진짜',
        '토큰이 곰팡이 피겠다 며칠째야',
        '연속 미사용 기록 갱신 중이니? 자랑스럽냐?',
      ],
      en: [
        "Days without using anything... subscription money floating away...",
        "Keep this up and Mom will use them herself!",
        "How many days has it been? Mom is REALLY angry",
        "Tokens are growing mold at this point",
        "Going for the unused streak record? Proud of yourself?",
      ],
      ja: [
        '何日使ってないの... サブスク代が空中に...',
        'このまま使わないならママが使うわよ？',
        'これ何日目？ママ本当に怒るわよ',
        'トークンにカビ生えてるわよ何日目よ',
        '未使用記録更新中？自慢なの？',
      ],
      zh: [
        '连续好几天没用了... 订阅费都飘在空中...',
        '再不用妈妈自己上了？',
        '这都第几天了？妈妈真生气了',
        'token都要发霉了都几天了',
        '连续未使用记录还在刷新？你骄傲吗？',
      ],
    },
    worried: {
      ko: [
        '며칠째 안 쓰는데... 무슨 일 있어?',
        '연속으로 안 쓰니까 엄마가 걱정돼',
        '혹시 아픈 건 아니지? 며칠째잖아',
        '다른 AI한테 간 거 아니지...? 며칠째야',
        '엄마가 불안해... 좀 써줘',
      ],
      en: [
        "Haven't used it for days... is everything okay?",
        "Not using it for days straight makes Mom worry",
        "You're not sick, right? It's been days",
        "You didn't go to another AI...? It's been days",
        "Mom is anxious... please use some",
      ],
      ja: [
        '何日も使ってないけど... 何かあったの？',
        '連続で使わないとママ心配よ',
        'まさか具合悪いんじゃないでしょうね？何日目よ',
        'まさか他のAIに行ったんじゃ...？何日目よ',
        'ママ不安よ... 少し使って',
      ],
      zh: [
        '好几天没用了... 怎么了？',
        '连续不用妈妈好担心',
        '不会是生病了吧？都好几天了',
        '该不会去用别的AI了吧...？都好几天了',
        '妈妈好不安... 用一点吧',
      ],
    },
  },
  spike: {
    happy: {
      ko: [
        '갑자기 확 늘었네~ 뭔가 재미있는 거 하나 보다!',
        '어제보다 훨씬 많이 쓰네~ 이 기세야!',
        '폭풍 사용 중이네~ 좋아좋아~',
        '갑자기 열심히 하니까 엄마가 좋다~',
        '사용량 급증! 이게 바로 성장이야~',
      ],
      en: [
        'Sudden spike~ Must be working on something fun!',
        'Way more than yesterday~ Keep this energy!',
        "Storm usage in progress~ Love it~",
        "Suddenly working hard — Mom likes this~",
        'Usage spike! This is called GROWTH~',
      ],
      ja: [
        '急に増えたね〜何か面白いことしてるの！',
        '昨日よりずっと多い〜この勢いよ！',
        '嵐のように使ってるね〜いいわいいわ〜',
        '急に頑張り出してママ嬉しい〜',
        '使用量急増！これが成長ってやつよ〜',
      ],
      zh: [
        '突然暴增~ 是在做什么有趣的事吧！',
        '比昨天多多了~ 保持这个势头！',
        '暴风使用中~ 喜欢喜欢~',
        '突然开始努力，妈妈很高兴~',
        '用量暴增！这就叫成长~',
      ],
    },
    proud: {
      ko: [
        '어제 대비 폭풍 성장!! 장하다!!',
        '갑자기 폭발적인 사용량!! 마감이야?!',
        '사용량이 로켓처럼 올라가네!! 대견해!!',
        '어제의 너와 오늘의 너는 다르구나!! 감동!!',
        '이 급증세면 이모한테 실시간 보고해야지!!',
      ],
      en: [
        'Explosive growth from yesterday!! So proud!!',
        'Sudden explosive usage!! Is it a deadline?!',
        "Usage going up like a rocket!! I'm so moved!!",
        "Yesterday's you and today's you are different!! Touching!!",
        'At this spike rate I need to live-report to auntie!!',
      ],
      ja: [
        '昨日から嵐のような成長！！偉い！！',
        '急に爆発的な使用量！！締め切り？！',
        '使用量がロケットみたい！！感動！！',
        '昨日のあなたと今日のあなたは違う！！泣ける！！',
        'この急増ぶりはおばさんにリアルタイム報告しなきゃ！！',
      ],
      zh: [
        '比昨天暴风成长！！太棒了！！',
        '突然爆发性使用！！是赶截止日期？！',
        '用量像火箭一样上升！！好感动！！',
        '昨天的你和今天的你不一样！！感动！！',
        '这个增长速度得给阿姨实时汇报！！',
      ],
    },
  },
  resetImminent: {
    angry: {
      ko: [
        '리셋까지 얼마 안 남았는데 반도 안 썼어!',
        '곧 리셋인데 이게 뭐야?!',
        '리셋 전에 좀 써!! 시간 없어!!',
        '카운트다운 시작이야! 빨리 써!!',
        '리셋되면 다 사라져!! 지금 당장 써!!',
      ],
      en: [
        "Reset's coming and you haven't even hit half!",
        "Reset is soon and THIS is what you've done?!",
        'Use some before reset!! No time left!!',
        "Countdown started! Use them NOW!!",
        "It all disappears on reset!! USE THEM NOW!!",
      ],
      ja: [
        'リセットまであと少しなのに半分も使ってない！',
        'もうすぐリセットなのにこれは何？！',
        'リセット前に使って！！時間ないわよ！！',
        'カウントダウン開始よ！早く使って！！',
        'リセットされたら全部消えるのよ！！今すぐ使って！！',
      ],
      zh: [
        '快重置了连一半都没用！',
        '马上重置了就这点？！',
        '重置前赶紧用！！没时间了！！',
        '倒计时开始了！快用！！',
        '重置了就全没了！！现在就用！！',
      ],
    },
    worried: {
      ko: [
        '리셋까지 얼마 안 남았어... 좀 써줘',
        '시간이 별로 없는데... 조금이라도 써봐',
        '곧 리셋인데 이대로 괜찮아?',
        '리셋 타이머 보여? 좀 서둘러줘',
        '남은 시간 동안이라도 좀 써주면 안 될까...',
      ],
      en: [
        "Not much time until reset... please use some",
        "Running out of time... use at least a little",
        "Reset is coming — is this really okay?",
        "See the reset timer? Please hurry",
        "Can't you use some in the time remaining...",
      ],
      ja: [
        'リセットまであと少し... 使って',
        '時間あまりないのに... 少しでも使ってみて',
        'もうすぐリセットだけどこのままでいいの？',
        'リセットタイマー見えてる？急いで',
        '残り時間だけでも使ってくれない...',
      ],
      zh: [
        '快重置了... 用一点吧',
        '时间不多了... 哪怕用一点点',
        '马上重置了这样真的行吗？',
        '看到重置计时器了吗？请快点',
        '剩下的时间能不能用一点...',
      ],
    },
  },
};

/**
 * Evaluates context triggers in priority order: unusedStreak > resetImminent > spike > weekend.
 * Returns the first matching trigger, or null if none match.
 */
export function evaluateContextTrigger(ctx: TriggerContext): ContextTrigger | null {
  const { now, dailyHistory, weeklyUtilization, resetsAt } = ctx;

  // unusedStreak: 2+ consecutive zero-usage days
  if (dailyHistory.length >= 2) {
    const sorted = [...dailyHistory].sort((a, b) => a.date.localeCompare(b.date));
    const last2 = sorted.slice(-2);
    if (last2[0].percent === 0 && last2[1].percent === 0) {
      return 'unusedStreak';
    }
  }

  // resetImminent: reset in <3 hours and usage <50%
  if (resetsAt) {
    const resetMs = new Date(resetsAt).getTime() - now.getTime();
    const threeHoursMs = 3 * 60 * 60 * 1000;
    if (resetMs > 0 && resetMs < threeHoursMs && (weeklyUtilization ?? 0) < 50) {
      return 'resetImminent';
    }
  }

  // spike: usage jumped 30%+ from yesterday to today
  if (dailyHistory.length >= 2) {
    const sorted = [...dailyHistory].sort((a, b) => a.date.localeCompare(b.date));
    const last2 = sorted.slice(-2);
    const diff = last2[1].percent - last2[0].percent;
    if (diff >= 30) {
      return 'spike';
    }
  }

  // weekend: Saturday (6) or Sunday (0)
  const day = now.getDay();
  if (day === 0 || day === 6) {
    return 'weekend';
  }

  return null;
}

/**
 * Returns a contextual message if a trigger matches and has messages for the given mood/locale.
 * Falls back to the regular getMessage() if no contextual message is available.
 * Uses the same time-seeded rotation as getMessage().
 */
export function getContextualMessage(mood: MamaMood, locale: Locale, ctx: TriggerContext): string {
  const trigger = evaluateContextTrigger(ctx);

  if (trigger) {
    const moodPool = CONTEXTUAL_POOLS[trigger][mood];
    if (moodPool) {
      const pool = moodPool[locale] ?? moodPool['en'];
      if (pool && pool.length > 0) {
        const windowSeed = Math.floor(Date.now() / 120_000);
        return pool[windowSeed % pool.length];
      }
    }
  }

  return getMessage(mood, locale);
}
