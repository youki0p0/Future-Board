"use client";

import type { GameEvent, Player, Square } from "@/types/game";
import { effectMeta } from "@/lib/effects";

function nameOf(players: Player[], id: string | null | undefined): string {
  if (!id) return "システム";
  return players.find((p) => p.id === id)?.name ?? "誰か";
}

function describe(e: GameEvent, players: Player[], squares: Square[]): string {
  const who = nameOf(players, e.player_id);
  const p = e.payload ?? {};
  const sqTitle = (() => {
    const sid = p.squareId as string | undefined;
    const sq = sid ? squares.find((s) => s.id === sid) : undefined;
    return sq ? `「${sq.title}」` : "マス";
  })();

  switch (e.event_type) {
    case "join":
      return `${(p.name as string) ?? who} が参加しました`;
    case "leave":
      return `${(p.name as string) ?? who} が退室しました`;
    case "start_setup":
      return "仕込みフェーズが始まりました";
    case "start_game":
      return "ゲーム開始！";
    case "roll":
      return `${who} が ${p.dice} を出して ${p.from}→${p.to} へ`;
    case "step":
      return `${who} が ${sqTitle} を踏んだ`;
    case "reveal":
      return `${sqTitle} が公開された！`;
    case "effect": {
      const eff = p.effect as string;
      switch (eff) {
        case "move_forward":
          return `${who} は +${p.amount} 前進（→${p.to}）`;
        case "move_backward":
          return `${who} は -${p.amount} 後退（→${p.to}）`;
        case "skip_turn":
          return `${who} は次のターン休み`;
        case "roll_again":
          return `${who} はもう一度振れる！`;
        case "position_swap":
          return `${who} は ${p.targetName ?? "誰か"} と位置を交換`;
        case "everyone":
          return `全員 ${(p.dir as number) > 0 ? "+1 前進" : "-1 後退"}`;
        case "vote":
          return `${who} のマスで投票発生！`;
        case "vote_result":
          return `投票の結果 ${who} は ${(p.delta as number) > 0 ? "+2" : "-2"}`;
        case "prompt":
          return `${who} にお題！`;
        case "prompt_result":
          return `${who} はお題に ${p.success ? "成功 +2" : "拒否 -2"}`;
        case "no_effect":
          return `${who} が踏んだマスは効果なし`;
        default:
          return `${who}: ${effectMeta((eff as never) ?? "no_effect").label}`;
      }
    }
    case "skip":
      return `${who} はお休み中（スキップ）`;
    case "last_spurt":
      return "🔥 Last Spurt 解禁！追加仕込みが可能に";
    case "placement":
      return `${who} が終盤マスを追加`;
    case "win":
      return `🏁 ${who} がゴール！`;
    default:
      return `${who}: ${e.event_type}`;
  }
}

export default function EventLog({
  events,
  players,
  squares,
}: {
  events: GameEvent[];
  players: Player[];
  squares: Square[];
}) {
  const recent = [...events].slice(-40).reverse();
  return (
    <div className="mk-scroll max-h-56 overflow-y-auto">
      <ul className="grid gap-1.5">
        {recent.map((e) => (
          <li key={e.id} className="text-[12px] leading-snug text-makina-muted">
            <span className="mr-1 text-makina-line">›</span>
            {describe(e, players, squares)}
          </li>
        ))}
        {recent.length === 0 && (
          <li className="text-[12px] text-makina-muted">まだイベントはありません。</li>
        )}
      </ul>
    </div>
  );
}
