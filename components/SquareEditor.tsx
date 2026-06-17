"use client";

import { useState } from "react";
import type { EffectType, Visibility } from "@/types/game";
import { EFFECTS } from "@/lib/effects";
import { createSquare } from "@/lib/room";

export default function SquareEditor({
  roomId,
  playerId,
  position,
  phase,
  onClose,
  compact = false,
}: {
  roomId: string;
  playerId: string;
  position: number;
  phase: "setup" | "last_spurt";
  onClose: (created: boolean) => void;
  compact?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [effectType, setEffectType] = useState<EffectType>(compact ? "move_forward" : "no_effect");
  const [visibility, setVisibility] = useState<Visibility>("hidden");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await createSquare({
      roomId,
      position,
      creatorPlayerId: playerId,
      title: title.trim(),
      body: body.trim(),
      effectType,
      visibility,
      createdPhase: phase,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "作成に失敗しました");
      return;
    }
    onClose(true);
  }

  return (
    <div className="mk-panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-makina-accent">
          {position} マス目を仕込む
        </h3>
        <button className="text-sm text-makina-muted" onClick={() => onClose(false)}>
          ✕
        </button>
      </div>

      <div className="grid gap-3">
        <div>
          <label className="mk-label">マスタイトル</label>
          <input
            className="mk-input"
            placeholder="例：突然のダンスタイム"
            value={title}
            maxLength={40}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {!compact && (
          <div>
            <label className="mk-label">マス本文</label>
            <textarea
              className="mk-input min-h-[72px] resize-none"
              placeholder="踏んだ人が読む内容やお題を書こう"
              value={body}
              maxLength={200}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="mk-label">効果テンプレート</label>
          <select
            className="mk-input"
            value={effectType}
            onChange={(e) => setEffectType(e.target.value as EffectType)}
          >
            {EFFECTS.map((e) => (
              <option key={e.type} value={e.type}>
                {e.label} — {e.short}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-makina-muted">
            {EFFECTS.find((e) => e.type === effectType)?.description}
          </p>
        </div>

        <div>
          <label className="mk-label">公開設定</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setVisibility("hidden")}
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                visibility === "hidden"
                  ? "border-makina-accent bg-makina-accent/10"
                  : "border-makina-line bg-makina-panel2 text-makina-muted"
              }`}
            >
              🙈 伏せ（推奨）
            </button>
            <button
              onClick={() => setVisibility("public")}
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                visibility === "public"
                  ? "border-makina-accent bg-makina-accent/10"
                  : "border-makina-line bg-makina-panel2 text-makina-muted"
              }`}
            >
              👁 公開
            </button>
          </div>
          <p className="mt-1 text-[11px] text-makina-muted">
            伏せマスは作成者だけが内容を見られ、踏まれると全員に公開されます。
          </p>
        </div>

        {error && <p className="text-sm text-makina-danger">{error}</p>}

        <button className="mk-btn-primary" disabled={busy} onClick={submit}>
          {busy ? "仕込み中…" : "このマスを仕込む"}
        </button>
      </div>
    </div>
  );
}
