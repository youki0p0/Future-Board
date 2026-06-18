"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getClientId, getSavedName, saveName } from "@/lib/clientId";
import { createRoom, joinRoom } from "@/lib/room";
import { BOARD_OPTIONS } from "@/lib/board";
import type { BoardLength, JoinError } from "@/types/game";

const JOIN_ERROR_MESSAGES: Record<JoinError, string> = {
  not_configured: "サーバーに接続できません",
  not_found: "ルームが見つかりません",
  in_progress: "このゲームは既に開始しています",
  full: "満員です (最大8人)",
  join_failed: "参加に失敗しました",
};

type Mode = "menu" | "create" | "join";

export default function HomeScreen({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialCode ? "join" : "menu");
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode);
  const [boardLength, setBoardLength] = useState<BoardLength>(40);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(getSavedName());
  }, []);

  async function handleCreate() {
    setError(null);
    if (!name.trim()) return setError("名前を入力してください");
    setBusy(true);
    try {
      saveName(name.trim());
      const { code: newCode } = await createRoom(getClientId(), name.trim(), boardLength);
      router.push(`/room/${newCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ルーム作成に失敗しました");
      setBusy(false);
    }
  }

  async function handleJoin() {
    setError(null);
    if (!name.trim()) return setError("名前を入力してください");
    if (!code.trim()) return setError("ルームコードを入力してください");
    setBusy(true);
    try {
      saveName(name.trim());
      const res = await joinRoom(getClientId(), code.trim().toUpperCase(), name.trim());
      if (!res.ok) {
        setError(JOIN_ERROR_MESSAGES[res.error]);
        setBusy(false);
        return;
      }
      router.push(`/room/${code.trim().toUpperCase()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "参加に失敗しました");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-8 px-5 py-12">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-makina-accent">by Project MAKINA</p>
        <h1 className="mt-2 text-4xl font-bold leading-tight sm:text-5xl">
          Future<span className="text-makina-accent">Board</span>
        </h1>
        <p className="mt-3 text-makina-muted">仕込め。踏め。笑え。</p>
        <p className="mt-1 text-xs text-makina-muted">
          みんなで未来のマスを仕込んで、踏みに行くパーティすごろく。
        </p>
      </header>

      <section className="mk-panel w-full p-6">
        <div className="mb-4">
          <label className="mk-label">あなたの名前</label>
          <input
            className="mk-input"
            placeholder="プレイヤー名"
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {mode === "menu" && (
          <div className="grid gap-3">
            <button className="mk-btn-primary" onClick={() => setMode("create")}>
              ＋ ルームを作成
            </button>
            <button className="mk-btn-secondary" onClick={() => setMode("join")}>
              → ルームに参加
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="grid gap-4">
            <div>
              <label className="mk-label">盤面サイズ</label>
              <div className="grid grid-cols-3 gap-2">
                {BOARD_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setBoardLength(o.value)}
                    className={`rounded-xl border px-2 py-3 text-center text-sm transition ${
                      boardLength === o.value
                        ? "border-makina-accent bg-makina-accent/10 text-makina-text"
                        : "border-makina-line bg-makina-panel2 text-makina-muted"
                    }`}
                  >
                    <span className="block font-bold">{o.value}</span>
                    <span className="block text-[10px]">仕込み {o.squaresPerPlayer}個</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <button className="mk-btn-primary" disabled={busy} onClick={handleCreate}>
                {busy ? "作成中…" : "この設定で作成"}
              </button>
              <button className="mk-btn-secondary" disabled={busy} onClick={() => setMode("menu")}>
                戻る
              </button>
            </div>
          </div>
        )}

        {mode === "join" && (
          <div className="grid gap-4">
            <div>
              <label className="mk-label">ルームコード</label>
              <input
                className="mk-input text-center text-2xl tracking-[0.5em]"
                placeholder="ABCD"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="grid gap-2">
              <button className="mk-btn-primary" disabled={busy} onClick={handleJoin}>
                {busy ? "参加中…" : "参加する"}
              </button>
              <button className="mk-btn-secondary" disabled={busy} onClick={() => setMode("menu")}>
                戻る
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-makina-danger">{error}</p>}
      </section>

      <footer className="text-center text-[11px] text-makina-muted">
        ログイン不要 · 2〜8人 · スマホ対応
      </footer>
    </main>
  );
}
