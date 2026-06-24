"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clapLanding } from "@/lib/room";

// Applause button for a landing event. Taps are optimistic (instant local
// count) and batched: rapid taps accumulate and flush in one atomic RPC so the
// DB isn't hammered. Mount with key={landingId} so each landing gets a fresh
// counter.

const FLUSH_MS = 600;

export default function ClapButton({
  roomId,
  landingId,
  claps,
  size = "md",
  disabled = false,
}: {
  roomId: string;
  landingId: string;
  claps: number;
  size?: "md" | "lg";
  disabled?: boolean;
}) {
  const [display, setDisplay] = useState(claps);
  const [pop, setPop] = useState(0);
  const pending = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Catch up when other players clap — but never drop below our optimistic
  // count (our own flushed taps arrive back via `claps`, so max() avoids
  // double-counting them).
  useEffect(() => {
    setDisplay((d) => Math.max(d, claps));
  }, [claps]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const n = pending.current;
    pending.current = 0;
    if (n > 0) void clapLanding(roomId, landingId, n);
  }, [roomId, landingId]);

  // Flush buffered taps if the landing changes or the component unmounts.
  useEffect(() => () => flush(), [flush]);

  function onClap() {
    if (disabled) return;
    setDisplay((d) => d + 1);
    setPop((p) => p + 1);
    pending.current += 1;
    if (!timer.current) timer.current = setTimeout(flush, FLUSH_MS);
  }

  const big = size === "lg";

  return (
    <button
      type="button"
      onClick={onClap}
      disabled={disabled}
      aria-label="拍手する"
      className={`group inline-flex items-center gap-2 rounded-full border border-makina-warn/50 bg-makina-warn/10 font-bold text-makina-warn transition active:scale-90 disabled:opacity-50 ${
        big ? "px-6 py-3 text-xl" : "px-4 py-2 text-sm"
      }`}
    >
      <span
        key={pop}
        className="inline-block animate-pop-in"
        style={{ fontSize: big ? "1.6em" : "1.25em" }}
      >
        👏
      </span>
      <span className="tabular-nums">{display}</span>
      {big && <span className="text-sm font-semibold text-makina-warn/80">拍手！</span>}
    </button>
  );
}
