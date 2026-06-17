import type { EffectType } from "@/types/game";

export interface EffectMeta {
  type: EffectType;
  label: string;
  short: string;
  description: string;
  /** Interactive effects pause the turn until the player resolves them. */
  interactive: boolean;
}

export const EFFECTS: EffectMeta[] = [
  {
    type: "no_effect",
    label: "No Effect",
    short: "効果なし",
    description: "本文だけ表示。効果はありません。",
    interactive: false,
  },
  {
    type: "move_forward",
    label: "Move Forward",
    short: "前進 +1〜+3",
    description: "踏んだプレイヤーが 1〜3 マス進みます。",
    interactive: false,
  },
  {
    type: "move_backward",
    label: "Move Backward",
    short: "後退 -1〜-3",
    description: "踏んだプレイヤーが 1〜3 マス戻ります。",
    interactive: false,
  },
  {
    type: "skip_turn",
    label: "Skip Turn",
    short: "1回休み",
    description: "踏んだプレイヤーは次のターンを1回休みます。",
    interactive: false,
  },
  {
    type: "roll_again",
    label: "Roll Again",
    short: "もう一度振る",
    description: "踏んだプレイヤーはもう一度サイコロを振れます。",
    interactive: false,
  },
  {
    type: "position_swap",
    label: "Position Swap",
    short: "位置交換",
    description: "ランダムな他プレイヤーと位置を交換します。",
    interactive: false,
  },
  {
    type: "vote",
    label: "Vote",
    short: "みんなで投票",
    description: "全員で投票。好評なら +2、不評なら -2 マス。",
    interactive: true,
  },
  {
    type: "everyone",
    label: "Everyone Effect",
    short: "全員 ±1",
    description: "全員が +1 または -1 マス移動します。",
    interactive: false,
  },
  {
    type: "prompt",
    label: "Prompt / お題",
    short: "お題に挑戦",
    description: "本文のお題を実行。成功で +2、拒否で -2 マス。",
    interactive: true,
  },
];

const EFFECT_MAP: Record<EffectType, EffectMeta> = EFFECTS.reduce(
  (acc, e) => {
    acc[e.type] = e;
    return acc;
  },
  {} as Record<EffectType, EffectMeta>,
);

export function effectMeta(type: EffectType): EffectMeta {
  return EFFECT_MAP[type] ?? EFFECT_MAP.no_effect;
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
