"use client";

import { useState } from "react";

const PIPS: Record<number, string> = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
};

export default function DiceRoller({
  canRoll,
  onRoll,
  waitingLabel,
}: {
  canRoll: boolean;
  onRoll: () => Promise<{ dice: number }>;
  waitingLabel: string;
}) {
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState<number | null>(null);

  async function roll() {
    if (!canRoll || rolling) return;
    setRolling(true);
    // brief visual spin before resolving
    const spin = setInterval(() => setFace(Math.floor(Math.random() * 6) + 1), 80);
    await new Promise((r) => setTimeout(r, 500));
    try {
      const { dice } = await onRoll();
      setFace(dice);
    } finally {
      clearInterval(spin);
      setRolling(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-2xl border border-makina-line bg-makina-panel2 text-5xl ${
          rolling ? "animate-dice-roll" : ""
        }`}
      >
        {face ? PIPS[face] : "🎲"}
      </div>
      {canRoll ? (
        <button className="mk-btn-primary w-full animate-pulse-glow" disabled={rolling} onClick={roll}>
          {rolling ? "…" : "サイコロを振る"}
        </button>
      ) : (
        <p className="text-center text-sm text-makina-muted">{waitingLabel}</p>
      )}
    </div>
  );
}
