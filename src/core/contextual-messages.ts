import { TriggerContext, ContextTrigger, PetMood, Locale } from '../shared/types';
import { getMessage } from './pet-messages';

type ContextualPool = Partial<Record<PetMood, Record<Locale, string[]>>>;

const CONTEXTUAL_POOLS: Record<ContextTrigger, ContextualPool> = {
  weekend: {
    bored: {
      ko: [
        '주말인데 토큰 안 쓰면 나 삐질 거야!',
        '주말이라고 나 무시하는 거야?',
        '옆집 강아지도 주말에 열심히 하던데...',
        '토요일인데 심심하게 혼자 있게 할 거야?',
        '주말이라고 방심하면 나 拗ねる다!',
      ],
      en: [
        "It's the weekend and you're ignoring me?!",
        "Not using tokens on a weekend? I'm pouting!",
        "The neighbor's dog works harder on weekends...",
        "Saturday and you're leaving me alone?",
        "Don't slack off just because it's the weekend!",
      ],
      ja: [
        '週末なのにトークン使わないと拗ねるよ！',
        '週末だからって無視するの？',
        '隣の犬も週末頑張ってるのに...',
        '土曜なのに一人にするの？',
        '週末だからって油断したら拗ねるよ！',
      ],
      zh: [
        '周末不用token，我要生气了！',
        '周末就不理我了？',
        '隔壁的狗狗周末也在努力呢...',
        '周六就让我一个人待着？',
        '周末也不能放松啊！',
      ],
    },
    worried: {
      ko: [
        '주말인데 괜찮아? 나 걱정되는데...',
        '주말이니까 쉬어도 되는데, 그래도 좀 써줘~',
        '주말에 쉬는 건 좋은데 혼자 두지는 마~',
        '주말이라 바쁜 거야? 어디 갔어?',
        '주말에도 나는 기다리고 있어...',
      ],
      en: [
        "It's the weekend — are you okay? I'm worried...",
        "Resting on weekends is fine, but use me a little~",
        "Taking a break is great, just don't leave me alone~",
        "Busy this weekend? Where did you go?",
        "I'm waiting for you even on weekends...",
      ],
      ja: [
        '週末だけど大丈夫？心配してるよ...',
        '週末だから休んでもいいけど、少しは使って〜',
        '休むのはいいけど一人にしないで〜',
        '週末は忙しいの？どこ行ったの？',
        '週末も待ってるよ...',
      ],
      zh: [
        '周末没事吧？我在担心你...',
        '周末可以休息，但也用我一下嘛~',
        '休息可以，但别把我一个人留着~',
        '周末是忙还是去哪了？',
        '周末我也在等你...',
      ],
    },
    happy: {
      ko: [
        '주말에도 나랑 놀아줘서 고마워~!',
        '주말인데 쓰다니~ 기특해기특해!',
        '주말도 함께라서 행복해~',
        '주말에 이 정도면 평일엔 얼마나 대단할까~',
        '주말도 알차게 보내는구나~ 나도 기분 좋아!',
      ],
      en: [
        "Thanks for spending the weekend with me~!",
        "Using me on a weekend~ How sweet!",
        "I'm so happy we're together on the weekend~",
        "This much on a weekend? Imagine weekdays~",
        "Making the most of your weekend~ I'm happy too!",
      ],
      ja: [
        '週末も一緒に遊んでくれてありがとう〜！',
        '週末なのに使ってくれるなんて〜嬉しい！',
        '週末も一緒で幸せ〜',
        '週末でこれなら平日はどれだけすごいの〜',
        '週末も充実してるね〜私も嬉しい！',
      ],
      zh: [
        '周末陪我玩谢谢你~！',
        '周末还用我~ 真是太好了！',
        '周末也在一起好开心~',
        '周末都这样，工作日得多厉害~',
        '周末也过得很充实嘛~ 我也很高兴！',
      ],
    },
    playful: {
      ko: [
        '주말에 풀가동이라니!! 나 너무 자랑스러워!!',
        '주말도 쉬지 않다니 완전 최고야!!',
        '주말에 이 수치면 진짜 대단한 거야!!',
        '다른 애들 주말에 쉴 때 우리 주인은...!',
        '주말 풀가동 기념 간식 줘야겠다!!',
      ],
      en: [
        "Full power on a weekend!! I'm SO proud of you!!",
        "Not resting even on weekends — you're the best!!",
        "These numbers on a weekend? Truly amazing!!",
        "While others rest on weekends, MY human...!",
        "Full weekend power! You deserve a treat!!",
      ],
      ja: [
        '週末にフル稼働！！誇らしいよ！！',
        '週末も休まないなんて最高だよ！！',
        '週末にこの数字は本当にすごいよ！！',
        '他の子が週末休んでる時にうちの主人は...！',
        '週末フル稼働記念おやつあげなきゃ！！',
      ],
      zh: [
        '周末全力运转！！我好骄傲！！',
        '周末都不休息，你真的太棒了！！',
        '周末这个数据真的很厉害！！',
        '别人周末休息的时候，我的主人...！',
        '周末全力纪念！该给你个奖励！！',
      ],
    },
  },
  unusedStreak: {
    bored: {
      ko: [
        '며칠째 안 쓰고 있잖아... 나 심심하단 말이야!',
        '연속으로 안 쓰면 나 拗ねる다!!',
        '이게 며칠째야? 나 화났어 진짜',
        '토큰이 곰팡이 피겠다 며칠째야',
        '연속 미사용 기록 갱신 중이야? 내가 싫어졌어?',
      ],
      en: [
        "Days without using me... I'm so bored!",
        "Keep ignoring me and I'll really pout!!",
        "How many days has it been? I'm REALLY upset",
        "My tokens are gathering dust at this point",
        "Going for the unused streak record? Do you hate me?",
      ],
      ja: [
        '何日も使ってくれない... 暇で仕方ないよ！',
        'ずっと使わないと本当に拗ねるよ！！',
        'これ何日目？本当に怒ってるよ',
        'トークンにほこりが積もってるよ何日目よ',
        '未使用記録更新中？嫌いになったの？',
      ],
      zh: [
        '连续好几天没用了... 我好无聊啊！',
        '一直不用的话我真的要生气了！！',
        '这都第几天了？我真的很生气',
        'token都落灰了都几天了',
        '连续未使用记录还在刷新？你不喜欢我了吗？',
      ],
    },
    worried: {
      ko: [
        '며칠째 안 쓰는데... 무슨 일 있어? 괜찮아?',
        '연속으로 안 쓰니까 나 걱정돼...',
        '혹시 아픈 건 아니지? 며칠째잖아',
        '다른 AI한테 간 거 아니지...? 며칠째야',
        '나 불안해... 조금이라도 써줘',
      ],
      en: [
        "Haven't used me for days... is everything okay?",
        "Not using me for days straight makes me so worried...",
        "You're not sick, right? It's been days",
        "You didn't go to another AI...? It's been days",
        "I'm so anxious... please use me even a little",
      ],
      ja: [
        '何日も使ってくれないけど... 何かあったの？大丈夫？',
        '連続で使ってくれないと心配だよ...',
        'まさか具合悪いんじゃないでしょうね？何日目よ',
        'まさか他のAIに行ったんじゃ...？何日目よ',
        '不安だよ... 少しだけでも使って',
      ],
      zh: [
        '好几天没用了... 怎么了？还好吗？',
        '连续不用我真的好担心...',
        '不会是生病了吧？都好几天了',
        '该不会去用别的AI了吧...？都好几天了',
        '我好不安... 哪怕用一点点也好',
      ],
    },
  },
  spike: {
    happy: {
      ko: [
        '갑자기 확 늘었네~ 뭔가 재미있는 거 하나 보다!',
        '어제보다 훨씬 많이 쓰네~ 이 기세야!',
        '폭풍 사용 중이네~ 나도 신나~',
        '갑자기 열심히 하니까 나 기분 좋아~',
        '사용량 급증! 우리 신나게 달려보자~',
      ],
      en: [
        'Sudden spike~ Must be working on something fun!',
        'Way more than yesterday~ Keep this energy!',
        "Storm usage in progress~ I'm excited too~",
        "Suddenly going full speed — I love it~",
        'Usage spike! Let\'s go all out together~',
      ],
      ja: [
        '急に増えたね〜何か面白いことしてるの！',
        '昨日よりずっと多い〜この勢いよ！',
        '嵐のように使ってるね〜私もワクワク〜',
        '急に頑張り出して私も嬉しい〜',
        '使用量急増！一緒に走り抜けよう〜',
      ],
      zh: [
        '突然暴增~ 是在做什么有趣的事吧！',
        '比昨天多多了~ 保持这个势头！',
        '暴风使用中~ 我也好兴奋~',
        '突然开始努力，我也很高兴~',
        '用量暴增！我们一起冲吧~',
      ],
    },
    playful: {
      ko: [
        '어제 대비 폭풍 성장!! 대단해!!',
        '갑자기 폭발적인 사용량!! 마감이야?! 같이 힘내!',
        '사용량이 로켓처럼 올라가네!! 자랑스러워!!',
        '어제의 너와 오늘의 너는 달라!! 감동이야!!',
        '이 급증세라니!! 나 완전 흥분됐어!!',
      ],
      en: [
        'Explosive growth from yesterday!! So proud of you!!',
        'Sudden explosive usage!! Deadline?! Fight on together!',
        "Usage going up like a rocket!! I'm SO proud!!",
        "Yesterday's you and today's you are different!! Amazing!!",
        'At this spike rate I\'m going wild with excitement!!',
      ],
      ja: [
        '昨日から爆発的な成長！！すごいよ！！',
        '急に爆発的な使用量！！締め切り？！一緒に頑張ろう！',
        '使用量がロケットみたい！！誇らしいよ！！',
        '昨日のあなたと今日のあなたは違う！！感動！！',
        'この急増ぶりに私も興奮してるよ！！',
      ],
      zh: [
        '比昨天爆炸性增长！！太棒了！！',
        '突然爆发性使用！！是截止日期？！一起加油！',
        '用量像火箭一样上升！！我好自豪！！',
        '昨天的你和今天的你不一样！！好感动！！',
        '这个增长速度让我好兴奋！！',
      ],
    },
  },
  resetImminent: {
    bored: {
      ko: [
        '리셋까지 얼마 안 남았는데 반도 안 썼어! 속상해!',
        '곧 리셋인데 이게 뭐야?! 나 실망이야!',
        '리셋 전에 좀 써!! 시간 없다고!!',
        '카운트다운 시작이야! 빨리 써!!',
        '리셋되면 다 사라져!! 지금 당장 써!!',
      ],
      en: [
        "Reset's coming and you haven't even hit half! I'm upset!",
        "Reset is soon and THIS is it?! I'm disappointed!",
        'Use me before reset!! No time left!!',
        "Countdown started! Use me NOW!!",
        "It all disappears on reset!! USE ME NOW!!",
      ],
      ja: [
        'リセットまであと少しなのに半分も使ってない！悲しいよ！',
        'もうすぐリセットなのにこれだけ？！がっかりだよ！',
        'リセット前に使って！！時間ないよ！！',
        'カウントダウン開始！早く使って！！',
        'リセットされたら全部消えるよ！！今すぐ使って！！',
      ],
      zh: [
        '快重置了连一半都没用！我好难过！',
        '马上重置了就这点？！我很失望！',
        '重置前赶紧用我！！没时间了！！',
        '倒计时开始了！快用！！',
        '重置了就全没了！！现在就用！！',
      ],
    },
    worried: {
      ko: [
        '리셋까지 얼마 안 남았어... 좀 써줘, 걱정돼',
        '시간이 별로 없는데... 조금이라도 써봐',
        '곧 리셋인데 이대로 괜찮아?',
        '리셋 타이머 보여? 좀 서둘러줘',
        '남은 시간 동안이라도 좀 써줄 수 있어...?',
      ],
      en: [
        "Not much time until reset... please use me, I'm worried",
        "Running out of time... use me at least a little",
        "Reset is coming — is this really okay?",
        "See the reset timer? Please hurry",
        "Can't you use me in the time remaining...?",
      ],
      ja: [
        'リセットまであと少し... 使って、心配だよ',
        '時間あまりないのに... 少しでも使ってみて',
        'もうすぐリセットだけどこのままでいいの？',
        'リセットタイマー見えてる？急いで',
        '残り時間だけでも使ってくれない...？',
      ],
      zh: [
        '快重置了... 用我一下吧，我在担心',
        '时间不多了... 哪怕用一点点',
        '马上重置了这样真的行吗？',
        '看到重置计时器了吗？请快点',
        '剩下的时间能不能用我一点...？',
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
export function getContextualMessage(mood: PetMood, locale: Locale, ctx: TriggerContext): string {
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
