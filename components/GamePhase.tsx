"use client";

import { useEffect, useState } from "react";
import type { Player, Room, Square, GameEvent } from "@/types/game";
import { currentPlayer, turnOrder } from "@/lib/gameRules";
import { effectMeta } from "@/lib/effects";
import { lastSpurtCandidates } from "@/lib/board";
import {
  deleteSquare,
  resolvePlacement,
  resolvePrompt,
  resolveVote,
  takeTurn,
} from "@/lib/room";
import GameBoard from "@/components/GameBoard";
import DiceRoller from "@/components/DiceRoller";
import PlayerList from "@/components/PlayerList";
import EventLog from "@/components/EventLog";
import SquareEditor from "@/components/SquareEditor";

export default function GamePhase({
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
  const isHost = me?.client_id === room.host_client_id;
  const turn = currentPlayer(players, room.current_turn_player_id);
  const pending = room.state?.pending ?? null;
  const lastSquare = room.state?.lastSquare ?? null;
  const myTurn = !!me && turn?.id === me.id;

  const [showModerate, setShowModerate] = useState(false);
  const [placePos, setPlacePos] = useState<number | null>(null);

  // Full-screen "someone stopped here" announcement. It shows whenever a player
  // lands on a planted square (lastSquare) and is dismissed locally per client.
  // The signature changes on each new landing so the overlay re-appears.
  const [dismissedLanding, setDismissedLanding] = useState<string | null>(null);
  const landingSig = lastSquare
    ? `${lastSquare.position}|${lastSquare.landedByName}|${lastSquare.title}`
    : null;
  const showLanding = !!lastSquare && landingSig !== dismissedLanding;

  // Reset the dismissal once the landing clears, so re-landing the same square
  // later still announces.
  useEffect(() => {
    if (!landingSig) setDismissedLanding(null);
  }, [landingSig]);

  const pendingForMe = !!me && pending && "playerId" in pending && pending.playerId === me.id;
  const canRoll = myTurn && !pending;

  const pendingPlayerName =
    pending && "playerId" in pending
      ? players.find((p) => p.id === pending.playerId)?.name ?? "プレイヤー"
      : "";

  async function onRoll() {
    if (!me) return { dice: 0 };
    return takeTurn(room, me);
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      {/* Full-screen landing announcement */}
      {showLanding && lastSquare && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="mk-panel animate-pop-in w-full max-w-md border-makina-accent/40 p-7 text-center shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-makina-accent">
              STOP!
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-snug">
              <span className="text-makina-accent">{lastSquare.landedByName}</span> さんが
              <br />
              止まりました！
            </h2>

            <div className="mt-5 rounded-2xl border border-makina-line bg-makina-bg/50 p-4">
              <p className="text-xs text-makina-muted">内容は</p>
              <p className="mt-1 text-xl font-bold break-words">「{lastSquare.title}」</p>
              {lastSquare.body && (
                <p className="mt-2 text-sm text-makina-muted break-words">{lastSquare.body}</p>
              )}
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="mk-chip text-makina-muted">{lastSquare.position} マス目</span>
                <span className="mk-chip text-makina-accent">
                  {effectMeta(lastSquare.effectType).short}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-makina-muted">
                仕込んだ人: {lastSquare.creatorName}
              </p>
            </div>

            <button
              className="mk-btn-primary mt-6 w-full"
              onClick={() => setDismissedLanding(landingSig)}
              autoFocus
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-makina-muted">
            Room {room.code}
          </p>
          <p className="text-lg font-bold">
            {turn ? (
              <>
                <span className="text-makina-accent">{turn.name}</span> の番
                {myTurn && <span className="ml-1 text-makina-accent">(あなた)</span>}
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
        {room.last_spurt_enabled && (
          <span className="mk-chip animate-pop-in border-makina-danger/50 text-makina-danger">
            🔥 LAST SPURT
          </span>
        )}
      </header>

      {/* Board */}
      <section className="mk-panel mb-4 p-3">
        <GameBoard
          boardLength={room.board_length}
          squares={squares}
          players={players}
          meId={me?.id}
          myPlayerId={me?.id}
          focusPosition={turn?.position ?? null}
        />
      </section>

      {/* Current square */}
      {lastSquare && (
        <section className="mk-panel mb-4 animate-pop-in p-4">
          <div className="flex items-center justify-between">
            <span className="mk-chip text-makina-accent">{lastSquare.position} マス目</span>
            <span className="text-[11px] text-makina-muted">
              {effectMeta(lastSquare.effectType).label}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold">{lastSquare.title}</h3>
          {lastSquare.body && <p className="mt-1 text-sm text-makina-muted">{lastSquare.body}</p>}
          <p className="mt-2 text-[11px] text-makina-muted">作成者: {lastSquare.creatorName}</p>
        </section>
      )}

      {/* Pending interactions */}
      {pending?.kind === "prompt" && (
        <section className="mk-panel mb-4 p-4 text-center">
          <p className="mb-3 text-sm">
            {pendingForMe ? "お題に挑戦！結果を選んでください" : `${pendingPlayerName} がお題に挑戦中…`}
          </p>
          {pendingForMe && (
            <div className="grid grid-cols-2 gap-2">
              <button className="mk-btn-primary" onClick={() => resolvePrompt(room, true)}>
                成功 +2
              </button>
              <button className="mk-btn-danger" onClick={() => resolvePrompt(room, false)}>
                拒否 -2
              </button>
            </div>
          )}
        </section>
      )}

      {pending?.kind === "vote" && (
        <section className="mk-panel mb-4 p-4 text-center">
          <p className="mb-1 text-sm font-semibold">🗳 みんなで投票！</p>
          <p className="mb-3 text-[11px] text-makina-muted">
            全員で相談して結果を入力してください（簡易投票）。
          </p>
          {pendingForMe ? (
            <div className="grid grid-cols-2 gap-2">
              <button className="mk-btn-primary" onClick={() => resolveVote(room, true)}>
                好評 +2
              </button>
              <button className="mk-btn-danger" onClick={() => resolveVote(room, false)}>
                不評 -2
              </button>
            </div>
          ) : (
            <p className="text-sm text-makina-muted">{pendingPlayerName} が結果を入力します</p>
          )}
        </section>
      )}

      {pending?.kind === "placement" && pendingForMe && me && (
        <section className="mb-4">
          {placePos === null ? (
            <div className="mk-panel p-4">
              <p className="mb-1 text-sm font-semibold text-makina-danger">🔥 追加仕込みのチャンス</p>
              <p className="mb-3 text-[11px] text-makina-muted">
                ゴール前を荒らそう。1マス仕込むか、スキップできます。
              </p>
              <div className="grid grid-cols-3 gap-2">
                {lastSpurtCandidates(room.board_length, me.position, squares).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPlacePos(pos)}
                    className="rounded-xl border border-makina-line bg-makina-panel2 px-2 py-3 text-center transition hover:border-makina-danger"
                  >
                    <span className="block text-base font-bold">{pos}</span>
                    <span className="block text-[10px] text-makina-muted">マス目</span>
                  </button>
                ))}
              </div>
              <button
                className="mk-btn-secondary mt-3 w-full"
                onClick={() => resolvePlacement(room)}
              >
                スキップして次の人へ
              </button>
            </div>
          ) : (
            <SquareEditor
              roomId={room.id}
              playerId={me.id}
              position={placePos}
              phase="last_spurt"
              compact
              onClose={(created) => {
                setPlacePos(null);
                if (created) void resolvePlacement(room);
              }}
            />
          )}
        </section>
      )}

      {pending?.kind === "placement" && !pendingForMe && (
        <p className="mb-4 text-center text-sm text-makina-muted">
          {pendingPlayerName} が追加仕込み中…
        </p>
      )}

      {/* Dice */}
      {!pending && (
        <section className="mk-panel mb-4 p-5">
          <DiceRoller
            canRoll={canRoll}
            onRoll={onRoll}
            waitingLabel={turn ? `${turn.name} の番を待っています…` : "待機中…"}
          />
        </section>
      )}

      {/* Players */}
      <section className="mk-panel mb-4 p-4">
        <h2 className="mb-2 text-sm font-semibold text-makina-muted">プレイヤー</h2>
        <PlayerList
          players={turnOrder(players)}
          currentTurnId={room.current_turn_player_id}
          meId={me?.id}
          boardLength={room.board_length}
        />
      </section>

      {/* Event log */}
      <section className="mk-panel mb-4 p-4">
        <h2 className="mb-2 text-sm font-semibold text-makina-muted">イベントログ</h2>
        <EventLog events={events} players={players} squares={squares} />
      </section>

      {/* Host moderation */}
      {isHost && (
        <section className="mk-panel p-4">
          <button
            className="text-sm font-semibold text-makina-muted"
            onClick={() => setShowModerate((s) => !s)}
          >
            {showModerate ? "▾" : "▸"} ホスト管理（マス削除）
          </button>
          {showModerate && (
            <ul className="mt-3 grid gap-2">
              {squares.length === 0 && (
                <li className="text-[12px] text-makina-muted">マスはありません。</li>
              )}
              {squares.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-makina-line bg-makina-panel2 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-[12px]">
                    {s.position}: {s.is_revealed || s.visibility === "public" ? s.title : "（伏せ）"}
                  </span>
                  <button
                    className="text-[12px] text-makina-danger"
                    onClick={() => deleteSquare(room.id, s.id)}
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
