"use client";

import { useEffect, useState } from "react";
import type { Player, Room } from "@/types/game";
import { BOARD_OPTIONS } from "@/lib/board";
import { renamePlayer, setBoardLength, setReady, startSetup } from "@/lib/room";
import { saveName } from "@/lib/clientId";
import { addCpuPlayer, CPU_TEST_MODE, cpuCount } from "@/lib/cpu";
import PlayerList from "@/components/PlayerList";

export default function Lobby({
  room,
  players,
  me,
}: {
  room: Room;
  players: Player[];
  me: Player | null;
}) {
  const isHost = me?.client_id === room.host_client_id;
  const [name, setName] = useState(me?.name ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (me) setName(me.name);
  }, [me]);

  const allReady = players.length >= 2 && players.every((p) => p.is_ready);

  async function commitName() {
    if (!me || !name.trim() || name.trim() === me.name) return;
    saveName(name.trim());
    await renamePlayer(me.id, name.trim());
  }

  async function copyLink() {
    const url = `${window.location.origin}/room/${room.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  }

  return (
    <main className="mx-auto max-w-lg px-5 py-8">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-makina-accent">Lobby</p>
        <h1 className="mt-1 text-2xl font-bold">ルーム {room.code}</h1>
        <button onClick={copyLink} className="mk-chip mt-2 text-makina-muted">
          {copied ? "✓ コピーしました" : "🔗 招待リンクをコピー"}
        </button>
      </header>

      <section className="mk-panel mb-4 p-5">
        <label className="mk-label">あなたの名前</label>
        <div className="flex gap-2">
          <input
            className="mk-input"
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
          />
          <button className="mk-btn-secondary px-4" onClick={commitName}>
            変更
          </button>
        </div>
      </section>

      <section className="mk-panel mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold text-makina-muted">
          プレイヤー ({players.length}/8)
        </h2>
        <PlayerList players={players} meId={me?.id} boardLength={room.board_length} />

        {CPU_TEST_MODE && isHost && (
          <button
            className="mk-btn-secondary mt-3 w-full border-dashed text-sm"
            disabled={players.length >= 8}
            onClick={() => addCpuPlayer(room.id, cpuCount(players) + 1)}
          >
            🤖 CPUを追加（テスト用・リリース時に削除）
          </button>
        )}
      </section>

      <section className="mk-panel mb-4 p-5">
        <label className="mk-label">盤面サイズ {isHost ? "(ホストが選択)" : ""}</label>
        <div className="grid grid-cols-3 gap-2">
          {BOARD_OPTIONS.map((o) => (
            <button
              key={o.value}
              disabled={!isHost}
              onClick={() => setBoardLength(room.id, o.value)}
              className={`rounded-xl border px-2 py-3 text-center text-sm transition disabled:opacity-60 ${
                room.board_length === o.value
                  ? "border-makina-accent bg-makina-accent/10 text-makina-text"
                  : "border-makina-line bg-makina-panel2 text-makina-muted"
              }`}
            >
              <span className="block font-bold">{o.value}</span>
              <span className="block text-[10px]">仕込み {o.squaresPerPlayer}個</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-3">
        {me && (
          <button
            className={me.is_ready ? "mk-btn-secondary" : "mk-btn-primary"}
            onClick={() => setReady(me.id, !me.is_ready)}
          >
            {me.is_ready ? "✓ 準備完了（解除する）" : "準備完了にする"}
          </button>
        )}

        {isHost ? (
          <button
            className="mk-btn-primary"
            disabled={!allReady}
            onClick={() => startSetup(room.id)}
          >
            {allReady ? "仕込みフェーズを開始" : "全員の準備を待っています…"}
          </button>
        ) : (
          <p className="text-center text-sm text-makina-muted">
            ホストの開始を待っています…
          </p>
        )}
        {players.length < 2 && (
          <p className="text-center text-xs text-makina-muted">2人以上で開始できます。</p>
        )}
      </div>
    </main>
  );
}
