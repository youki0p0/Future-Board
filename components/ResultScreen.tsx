"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GameEvent, Landing, Player, Room, Square } from "@/types/game";
import { computeResults, type PlayerResult } from "@/lib/gameRules";
import { resetGame } from "@/lib/room";
import { playerColor } from "@/components/PlayerList";

const MEDALS = ["🥇", "🥈", "🥉"];

function rankBadge(rank: number): string {
  return MEDALS[rank - 1] ?? `${rank}位`;
}

export default function ResultScreen({
  room,
  players,
  landings,
  me,
}: {
  room: Room;
  players: Player[];
  squares: Square[];
  events: GameEvent[];
  landings: Landing[];
  me: Player | null;
}) {
  const router = useRouter();
  const isHost = me?.client_id === room.host_client_id;
  const { ranking, hottestLanding } = computeResults(players, landings);

  const total = ranking.length;
  // Reveal from the bottom rank up to the winner, one tap at a time. Paced
  // locally per client so the suspense is each person's own.
  const [revealed, setRevealed] = useState(0);
  const allRevealed = revealed >= total;
  const firstRevealedIndex = total - revealed; // rows with index >= this are shown
  const nextIndex = firstRevealedIndex - 1; // the next person to announce
  const champion = allRevealed ? ranking[0] : null;

  return (
    <main className="mx-auto max-w-lg px-5 py-8">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-makina-accent">Result</p>
        <h1 className="mt-1 text-3xl font-bold">🎉 結果発表 🎉</h1>
        <p className="mt-2 text-sm text-makina-muted">
          勝敗は<strong className="text-makina-warn">拍手の数</strong>で決まる！
        </p>
      </header>

      {/* Winner banner */}
      {champion && (
        <section className="mk-panel animate-pop-in mb-5 border-makina-warn/50 bg-makina-warn/5 p-6 text-center shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-makina-warn">
            Winner
          </p>
          <p className="mt-2 text-5xl">👑</p>
          <p className="mt-1 text-2xl font-bold text-makina-warn">{champion.player.name}</p>
          <p className="mt-1 text-sm text-makina-muted">
            👏 {champion.claps} 拍手で優勝！
          </p>
        </section>
      )}

      {/* Ranking — masked until revealed */}
      <section className="mk-panel mb-4 p-4">
        <h2 className="mb-3 text-sm font-semibold text-makina-muted">
          順位（拍手が多い順）
        </h2>
        <ul className="grid gap-3">
          {ranking.map((r, i) => {
            const shown = i >= firstRevealedIndex;
            return shown ? (
              <RevealedCard
                key={r.player.id}
                result={r}
                players={players}
                meId={me?.id}
                isChampion={i === 0 && allRevealed}
              />
            ) : (
              <li
                key={r.player.id}
                className={`flex items-center gap-3 rounded-xl border border-dashed px-3 py-3 ${
                  i === nextIndex
                    ? "animate-pulse-glow border-makina-accent/60 bg-makina-panel2"
                    : "border-makina-line bg-makina-panel2/50"
                }`}
              >
                <span className="w-8 text-center text-lg">{rankBadge(r.rank)}</span>
                <span className="flex-1 text-sm font-semibold tracking-widest text-makina-muted">
                  ？ ？ ？
                </span>
                <span className="text-[11px] text-makina-muted">???</span>
              </li>
            );
          })}
        </ul>

        {!allRevealed && (
          <button
            className="mk-btn-primary mt-4 w-full"
            onClick={() => setRevealed((n) => Math.min(total, n + 1))}
          >
            {revealed === 0
              ? "🥁 最下位から発表する"
              : `▶ 次を発表（${rankBadge(ranking[nextIndex].rank)}）`}
          </button>
        )}
      </section>

      {/* Hottest single event */}
      {allRevealed && hottestLanding && (
        <section className="mk-panel mb-4 animate-pop-in p-5">
          <h2 className="mb-1 text-sm font-semibold text-makina-muted">
            🔥 一番盛り上がったイベント
          </h2>
          <p className="text-lg font-bold text-makina-accent break-words">
            「{hottestLanding.title}」
          </p>
          {hottestLanding.body && (
            <p className="mt-1 text-sm text-makina-muted break-words">{hottestLanding.body}</p>
          )}
          <p className="mt-2 text-[11px] text-makina-muted">
            👏 {hottestLanding.claps} 拍手 · {hottestLanding.position} マス目
          </p>
        </section>
      )}

      <div className="grid gap-3">
        {!allRevealed && (
          <button
            className="mk-btn-secondary"
            onClick={() => setRevealed(total)}
          >
            すべて表示
          </button>
        )}
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

function RevealedCard({
  result,
  players,
  meId,
  isChampion,
}: {
  result: PlayerResult;
  players: Player[];
  meId?: string | null;
  isChampion: boolean;
}) {
  const { player, rank, claps, landings } = result;
  return (
    <li
      className={`animate-pop-in rounded-xl border p-3 ${
        isChampion
          ? "border-makina-warn/60 bg-makina-warn/10"
          : "border-makina-line bg-makina-panel2"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="w-8 text-center text-xl">{rankBadge(rank)}</span>
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ background: playerColor(players, player.id) }}
        />
        <span className="flex-1 truncate text-base font-bold">
          {player.name}
          {player.id === meId && (
            <span className="ml-1 text-[10px] text-makina-accent">(あなた)</span>
          )}
        </span>
        <span className="text-lg font-bold text-makina-warn">👏 {claps}</span>
      </div>

      <div className="mt-3 border-t border-makina-line/60 pt-2">
        <p className="mb-1 text-[11px] font-semibold text-makina-muted">
          止まったイベント（盛り上がった順）
        </p>
        {landings.length === 0 ? (
          <p className="text-[11px] text-makina-muted">イベントなし</p>
        ) : (
          <ul className="grid gap-1">
            {landings.map((l, idx) => (
              <li
                key={l.id}
                className="flex items-center gap-2 text-[12px]"
              >
                <span className="text-makina-muted">{idx + 1}.</span>
                <span className="min-w-0 flex-1 truncate">「{l.title}」</span>
                <span className="shrink-0 text-makina-warn">👏 {l.claps}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
