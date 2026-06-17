"use client";

import type { Player } from "@/types/game";
import { turnOrder } from "@/lib/gameRules";

const COLORS = [
  "#34e1c4",
  "#7c5cff",
  "#ffce5a",
  "#ff5a7a",
  "#5ab0ff",
  "#5affa0",
  "#ff9f5a",
  "#d65aff",
];

export function playerColor(players: Player[], playerId: string): string {
  const order = turnOrder(players);
  const idx = order.findIndex((p) => p.id === playerId);
  return COLORS[(idx < 0 ? 0 : idx) % COLORS.length];
}

export default function PlayerList({
  players,
  currentTurnId,
  meId,
  boardLength,
}: {
  players: Player[];
  currentTurnId?: string | null;
  meId?: string | null;
  boardLength: number;
}) {
  const order = turnOrder(players);
  const goal = boardLength - 1;

  return (
    <ul className="grid gap-2">
      {order.map((p) => {
        const isTurn = p.id === currentTurnId;
        const remaining = Math.max(0, goal - p.position);
        return (
          <li
            key={p.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
              isTurn
                ? "border-makina-accent bg-makina-accent/10"
                : "border-makina-line bg-makina-panel2"
            }`}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: playerColor(players, p.id) }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold">
                  {p.name}
                  {p.id === meId && <span className="ml-1 text-[10px] text-makina-accent">(あなた)</span>}
                </span>
                {isTurn && <span className="mk-chip border-makina-accent/50 text-makina-accent">手番</span>}
                {p.skip_next_turn && <span className="mk-chip text-makina-warn">休み</span>}
              </div>
              <div className="mt-0.5 text-[11px] text-makina-muted">
                {p.position} / {goal} マス · ゴールまで {remaining}
              </div>
            </div>
            {p.is_ready && <span className="text-makina-accent">✓</span>}
          </li>
        );
      })}
    </ul>
  );
}
