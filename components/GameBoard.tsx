"use client";

import { useEffect, useRef } from "react";
import type { Player, Square } from "@/types/game";
import { goalIndex } from "@/lib/board";
import BoardSquare from "@/components/BoardSquare";

export default function GameBoard({
  boardLength,
  squares,
  players,
  meId,
  myPlayerId,
  focusPosition,
}: {
  boardLength: number;
  squares: Square[];
  players: Player[];
  meId?: string | null;
  myPlayerId?: string | null;
  focusPosition?: number | null;
}) {
  const goal = goalIndex(boardLength);
  const scroller = useRef<HTMLDivElement>(null);
  const squareByPos = new Map(squares.map((s) => [s.position, s]));

  // Keep the focused position (current player) in view as the game progresses.
  useEffect(() => {
    if (focusPosition == null || !scroller.current) return;
    const el = scroller.current.querySelector<HTMLElement>(`[data-pos="${focusPosition}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [focusPosition]);

  return (
    <div ref={scroller} className="mk-scroll overflow-x-auto pb-2">
      <div className="flex gap-2">
        {Array.from({ length: boardLength }, (_, i) => (
          <div key={i} data-pos={i}>
            <BoardSquare
              index={i}
              goal={goal}
              square={squareByPos.get(i) ?? null}
              playersHere={players.filter((p) => p.position === i)}
              allPlayers={players}
              meId={meId}
              myPlayerId={myPlayerId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
