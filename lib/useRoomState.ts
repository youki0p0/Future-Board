"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Player, RoomData } from "@/types/game";
import { getClientId } from "@/lib/clientId";
import { loadRoomData, subscribeRoom } from "@/lib/room";

export interface UseRoomState {
  data: RoomData | null;
  me: Player | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Loads a room by code and keeps it in sync via Supabase Realtime.
 * On any room-scoped DB change we refetch the affected room data — simple and
 * robust for the small data volumes of a single party game.
 */
export function useRoomState(code: string): UseRoomState {
  const [data, setData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clientId = useRef<string>("");
  const refetching = useRef(false);
  const queued = useRef(false);

  const refresh = useCallback(async () => {
    // Coalesce bursts of realtime events into sequential refetches.
    if (refetching.current) {
      queued.current = true;
      return;
    }
    refetching.current = true;
    try {
      const fresh = await loadRoomData(code);
      if (!fresh) {
        setError("ルームが見つかりません");
      } else {
        setError(null);
        setData(fresh);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
      refetching.current = false;
      if (queued.current) {
        queued.current = false;
        void refresh();
      }
    }
  }, [code]);

  useEffect(() => {
    clientId.current = getClientId();
    let channel: ReturnType<typeof subscribeRoom> | null = null;
    let active = true;

    (async () => {
      const fresh = await loadRoomData(code);
      if (!active) return;
      if (!fresh) {
        setError("ルームが見つかりません");
        setLoading(false);
        return;
      }
      setData(fresh);
      setLoading(false);
      channel = subscribeRoom(fresh.room.id, () => void refresh());
    })();

    // Polling fallback (shared spec): covers any realtime event that is missed.
    const poll = setInterval(() => void refresh(), 2500);

    return () => {
      active = false;
      clearInterval(poll);
      if (channel) channel.unsubscribe();
    };
  }, [code, refresh]);

  const me =
    data?.players.find((p) => p.client_id === clientId.current) ?? null;

  return { data, me, loading, error, refresh };
}
