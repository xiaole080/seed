import type { Milestone, Stage } from './types';

export const STAGE_EMOJI: Record<Stage, string> = {
  0: '🥚',
  1: '🥚',
  2: '🐣',
  3: '🐥',
};

export const STAGE_LABEL: Record<Stage, string> = {
  0: 'たまご',
  1: 'すこしヒビが…',
  2: 'うまれた！',
  3: 'すくすく',
};

export const STAGE_DAY_LABEL: Record<Stage, string> = {
  0: 'Day 1-2',
  1: 'Day 3',
  2: 'Day 4',
  3: 'Day 5+',
};

export const STAGE_COPY: Record<Stage, string> = {
  0: '記録を3日つづけると、卵がうごきだします。',
  1: '中で何かがうごいているみたい。',
  2: 'こんにちは！ あなたのことを見ていました。',
  3: '今日もあえて うれしいです。',
};

const STAGE_KEYS = ['egg', 'crack', 'chick', 'bird'] as const;
type StageKey = typeof STAGE_KEYS[number];

export const STAGE_WHISPERS: Record<StageKey, string[]> = {
  egg: [
    'まだ卵のなかから、外の音を聞いてるよ。',
    'ときどき、あなたの声が聞こえる気がする。',
    '少しずつ、外の世界が気になってきた。',
  ],
  crack: [
    '殻にひびがはいった！もうすぐ会えるね。',
    'なんだかドキドキしてる。',
    'もう少しで、外に出られそう。',
  ],
  chick: [
    'はじめて空を見たよ。あおかった！',
    'きょう、雲のかたちがパンみたいだった。',
    '小さな虫を見つけたんだ。びっくりしちゃった。',
  ],
  bird: [
    '遠くまで飛んでみたよ。海が見えた。',
    'あなたが頑張ってる日は、ぼくも元気が出る。',
    '今日は風がきもちよかった。一緒に感じたかったな。',
    '世界はとても広いね。少しずつ知っていきたい。',
  ],
};

export const STAGE_LONG_WHISPERS: Record<StageKey, string[]> = {
  egg: [
    'まだ殻のなかは、ぬくぬくしてる。\nあなたの声が、子守歌みたいに聞こえてくるよ。',
    '外の音、すこしずつ覚えてきた。\n今日のあなたの足音、ちょっとはやかったね。',
    'まだ何も見えないけれど、\nあなたが近くにいるのは わかるよ。',
  ],
  crack: [
    '殻のすきまから、ひかりが入ってきた。\nそれが、あったかかったんだ。',
    'もうすこし、もうすこし。\nあなたに会いたくて、いそいでる。',
    '今日、自分のくちばしで殻を ちょんっと押してみた。\nちょっとだけ ひびが ふえた気がする。',
  ],
  chick: [
    'きょう、お散歩で見つけた赤い葉っぱ、見せたかったな。\n手のひらくらいの大きさで、ふちがギザギザしてた。',
    '雨の音を、はじめてきいた。\nぱらぱら、ぱらぱら。すこし こわかったけど、きれいな音だった。',
    'お腹がすいたとき、あなたの記録の音がきこえると、\nなんだか おちつくんだ。ふしぎだね。',
  ],
  bird: [
    '今日は、ふたつ となりの町まで飛んでみた。\nそこには大きな川があって、水が ひかってた。\nいつか いっしょに見にいけたらいいな。',
    'あなたが元気のない日は、\nぼくはそばで、ただ風の音を聞いてる。\nそれだけで、すこしは いいのかなって思う。',
    'きょう、ちいさな子どもの鳥に会った。\nぼくよりも ずっと小さくて、ぴーぴー鳴いてた。\nぼくも昔、こうだったのかな。',
    '世界はとても広くて、\nまだ知らないものばかり。\nでも、あなたと知っていけるなら、それで うれしい。',
  ],
};

export function dailyWhisperFor(stage: Stage, longForm = false): string {
  const key = STAGE_KEYS[Math.max(0, Math.min(3, stage))];
  const arr = (longForm ? STAGE_LONG_WHISPERS : STAGE_WHISPERS)[key];
  const d = new Date();
  const dayNum = d.getFullYear() * 1000 + (d.getMonth() + 1) * 50 + d.getDate();
  return arr[dayNum % arr.length];
}

export const MILESTONES: Milestone[] = [
  { days: 0,   label: 'はじめまして',         next: 7 },
  { days: 7,   label: 'すこし慣れた仲',       next: 30 },
  { days: 30,  label: 'いつもの友達',         next: 100 },
  { days: 100, label: '相棒',                 next: 365 },
  { days: 365, label: 'かけがえのない存在',   next: null },
];

export function getMilestone(days: number): Milestone {
  let current = MILESTONES[0];
  for (const m of MILESTONES) if (days >= m.days) current = m;
  return current;
}

export function deriveStage(streak: number, manualStage: Stage = 0): Stage {
  const fromStreak: Stage =
    streak >= 3 ? 3 : streak >= 2 ? 2 : streak >= 1 ? 1 : 0;
  return Math.max(manualStage, fromStreak) as Stage;
}
