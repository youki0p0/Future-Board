"use client";

import { useRouter } from "next/navigation";
import type { GameEvent, Player, Room, Square } from "@/types/game";
import { computeResults } from "@/lib/gameRules";
import { resetGame } from "@/lib/room";
import { playerColor } from "@/components/PlayerList";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function ResultScreen({
  room,
  players,
  squares,
  events,
  me,
}: {
  room: Room;
  players: Player[];
  squares: Square[];
  events: GameEvent[];
  me: Player | null;
}) {
  const router = useRouter();
  const isHost = me?.client_id === room.host_client_id;
  const { ranking, hottestSquare } = computeResults(players, squares, events);
  const winner = players.find((p) => p.id === room.winner_player_id);

  return (
    <main className="mx-auto max-w-lg px-5 py-8">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-makina-accent">Result</p>
        <h1 className="mt-1 text-3xl font-bold">🏁 ゴール！</h1>
        {winner && (
          <p className="mt-2 text-lg">
            勝者は <span className="font-bold text-makina-accent">{winner.name}</span>
          </p>
        )}
      </header>

      <section className="mk-panel mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold text-makina-muted">順位</h2>
        <ul className="grid gap-2">
          {ranking.map((r) => (
            <li
              key={r.player.id}
              className="flex items-center gap-3 rounded-xl border border-makina-line bg-makina-panel2 px-3 py-2"
            >
              <span className="w-6 text-center text-lg">{MEDALS[r.rank - 1] ?? r.rank}</span>
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: playerColor(players, r.player.id) }}
              />
              <span className="flex-1 truncate text-sm font-semibold">{r.player.name}</span>
              <span className="text-[11px] text-makina-muted">
                踏んだ {r.stepped} · 踏まれた {r.ownStepped}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {hottestSquare && (
        <section className="mk-panel mb-4 p-5">
          <h2 className="mb-1 text-sm font-semibold text-makina-muted">🔥 一番盛り上がったマス</h2>
          <p className="text-lg font-bold text-makina-accent">{hottestSquare.square.title}</p>
          {hottestSquare.square.body && (
            <p className="mt-1 text-sm text-makina-muted">{hottestSquare.square.body}</p>
          )}
          <p className="mt-2 text-[11px] text-makina-muted">
            {hottestSquare.steps} 回踏まれました
          </p>
        </section>
      )}

      <div className="grid gap-3">
        {isHost ? (
          <button className="mk-btn-primary" onClick={() => resetGame(room.id)}>
            もう一度遊ぶ（ロビーへ）
          </button>
        ) : (
          <p className="text-center text-sm text-makina-muted">
            ホストが再戦を選ぶと自動でロビーに戻ります。
          </p>
        )}
        <button className="mk-btn-secondary" onClick={() => router.push("/")}>
          ホームに戻る
        </button>
      </div>
    </main>
  );
}
