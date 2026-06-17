"use client";

import type { Player, Square } from "@/types/game";
import { playerColor } from "@/components/PlayerList";

export default function BoardSquare({
  index,
  goal,
  square,
  playersHere,
  allPlayers,
  meId,
  myPlayerId,
}: {
  index: number;
  goal: number;
  square: Square | null;
  playersHere: Player[];
  allPlayers: Player[];
  meId?: string | null;
  myPlayerId?: string | null;
}) {
  const isStart = index === 0;
  const isGoal = index === goal;
  const mineHidden =
    square && !square.is_revealed && square.creator_player_id === myPlayerId;

  let label = "";
  if (isStart) label = "START";
  else if (isGoal) label = "GOAL";
  else if (square) {
    if (square.is_revealed || square.visibility === "public") label = square.title;
    else if (mineHidden) label = square.title; // creator sees their own hidden square
    else label = "???";
  }

  const hidden = square && !square.is_revealed && square.visibility === "hidden";

  return (
    <div
      className={`relative flex h-24 w-24 shrink-0 flex-col justify-between rounded-xl border p-2 text-left ${
        isGoal
          ? "border-makina-accent bg-makina-accent/10"
          : isStart
            ? "border-makina-accent2/60 bg-makina-accent2/10"
            : square
              ? hidden
                ? "border-makina-line bg-makina-panel2"
                : "border-makina-accent/40 bg-makina-panel"
              : "border-makina-line/60 bg-makina-bg/40"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-bold text-makina-muted">{index}</span>
        {mineHidden && <span className="text-[10px] text-makina-accent">★自分</span>}
      </div>

      <p
        className={`line-clamp-2 text-[11px] font-semibold leading-tight ${
          label === "???" ? "text-makina-muted" : "text-makina-text"
        }`}
      >
        {label}
      </p>

      <div className="flex flex-wrap gap-1">
        {playersHere.map((p) => (
          <span
            key={p.id}
            title={p.name}
            className={`h-3.5 w-3.5 rounded-full border ${
              p.id === meId ? "border-white" : "border-black/30"
            }`}
            style={{ background: playerColor(allPlayers, p.id) }}
          />
        ))}
      </div>
    </div>
  );
}
