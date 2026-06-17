"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player, Room, Square } from "@/types/game";
import { setupCandidates } from "@/lib/board";
import { setupCountFor, turnOrder } from "@/lib/gameRules";
import { startGame } from "@/lib/room";
import SquareEditor from "@/components/SquareEditor";

export default function SetupPhase({
  room,
  players,
  squares,
  me,
}: {
  room: Room;
  players: Player[];
  squares: Square[];
  me: Player | null;
}) {
  const isHost = me?.client_id === room.host_client_id;
  const perPlayer = room.setup_squares_per_player;
  const myCount = me ? setupCountFor(me.id, squares) : 0;
  const remaining = Math.max(0, perPlayer - myCount);

  const occupiedKey = useMemo(
    () => squares.map((s) => s.position).sort((a, b) => a - b).join(","),
    [squares],
  );

  const [candidates, setCandidates] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  // Refresh candidate positions whenever the board's occupancy changes.
  useEffect(() => {
    setCandidates(setupCandidates(room.board_length, squares, Math.max(perPlayer + 2, 5)));
    setSelected((prev) =>
      prev !== null && squares.some((s) => s.position === prev) ? null : prev,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occupiedKey, room.board_length, perPlayer]);

  const allDone = players.every((p) => setupCountFor(p.id, squares) >= perPlayer);

  return (
    <main className="mx-auto max-w-lg px-5 py-8">
      <header className="mb-5 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-makina-accent">Setup Phase</p>
        <h1 className="mt-1 text-2xl font-bold">仕込みフェーズ</h1>
        <p className="mt-1 text-sm text-makina-muted">
          各プレイヤーが {perPlayer} 個のマスを仕込みます。
        </p>
      </header>

      <section className="mk-panel mb-4 p-4">
        <h2 className="mb-2 text-sm font-semibold text-makina-muted">仕込み状況</h2>
        <ul className="grid gap-2">
          {turnOrder(players).map((p) => {
            const c = setupCountFor(p.id, squares);
            const done = c >= perPlayer;
            return (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className={p.id === me?.id ? "text-makina-text" : "text-makina-muted"}>
                  {p.name}
                  {p.id === me?.id && " (あなた)"}
                </span>
                <span className={done ? "text-makina-accent" : "text-makina-warn"}>
                  {c}/{perPlayer} {done ? "✓" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {me && remaining > 0 && selected === null && (
        <section className="mk-panel mb-4 p-5">
          <h2 className="mb-1 text-sm font-semibold">
            あと {remaining} 個 — 仕込むマスを選ぼう
          </h2>
          <p className="mb-3 text-[11px] text-makina-muted">候補から1つ選んで内容を作成します。</p>
          <div className="grid grid-cols-3 gap-2">
            {candidates.map((pos) => (
              <button
                key={pos}
                onClick={() => setSelected(pos)}
                className="rounded-xl border border-makina-line bg-makina-panel2 px-2 py-4 text-center transition hover:border-makina-accent"
              >
                <span className="block text-lg font-bold">{pos}</span>
                <span className="block text-[10px] text-makina-muted">マス目</span>
              </button>
            ))}
            {candidates.length === 0 && (
              <p className="col-span-3 text-sm text-makina-muted">空きマスがありません。</p>
            )}
          </div>
        </section>
      )}

      {me && selected !== null && (
        <div className="mb-4">
          <SquareEditor
            roomId={room.id}
            playerId={me.id}
            position={selected}
            phase="setup"
            onClose={() => setSelected(null)}
          />
        </div>
      )}

      {me && remaining === 0 && (
        <p className="mb-4 rounded-xl border border-makina-accent/40 bg-makina-accent/10 px-4 py-3 text-center text-sm text-makina-accent">
          ✓ あなたの仕込みは完了しました！
        </p>
      )}

      {isHost ? (
        <button className="mk-btn-primary w-full" disabled={!allDone} onClick={() => startGame(room.id)}>
          {allDone ? "ゲームを開始する" : "全員の仕込みを待っています…"}
        </button>
      ) : (
        <p className="text-center text-sm text-makina-muted">
          全員の仕込みが終わるとホストが開始します。
        </p>
      )}
    </main>
  );
}
