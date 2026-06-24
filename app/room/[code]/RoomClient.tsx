"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { consumeRoomLeft, getClientId, getSavedName } from "@/lib/clientId";
import { joinRoom } from "@/lib/room";
import { useRoomState } from "@/lib/useRoomState";
import { useCpuDriver } from "@/lib/cpu";
import Lobby from "@/components/Lobby";
import SetupPhase from "@/components/SetupPhase";
import GamePhase from "@/components/GamePhase";
import ResultScreen from "@/components/ResultScreen";

export default function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const { data, me, loading, error, refresh } = useRoomState(code);

  // Test-only: host browser auto-plays any CPU players. Remove before release.
  useCpuDriver(data, me);

  // If we have a saved name but aren't in this room yet (e.g. opened via link),
  // auto-join while the room is still joinable (status: waiting).
  useEffect(() => {
    if (loading || !data || me) return;
    if (data.room.status !== "waiting") return;
    // Just left this room → don't auto-rejoin; head home instead.
    if (consumeRoomLeft(code)) {
      router.replace("/");
      return;
    }
    const name = getSavedName();
    if (!name) {
      router.replace(`/?code=${code}`);
      return;
    }
    (async () => {
      const res = await joinRoom(getClientId(), code, name);
      if (res.ok) refresh();
    })();
  }, [loading, data, me, code, router, refresh]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-makina-muted">
        読み込み中…
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-makina-danger">{error ?? "ルームが見つかりません"}</p>
        <button className="mk-btn-secondary" onClick={() => router.push("/")}>
          ホームに戻る
        </button>
      </main>
    );
  }

  const { room, players, squares, events } = data;

  if (!me && room.status !== "waiting") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-makina-muted">このゲームは既に開始しています。観戦のみ可能です。</p>
        <button className="mk-btn-secondary" onClick={() => router.push("/")}>
          ホームに戻る
        </button>
      </main>
    );
  }

  switch (room.status) {
    case "waiting":
      return <Lobby room={room} players={players} me={me} />;
    case "setup":
      return <SetupPhase room={room} players={players} squares={squares} me={me} />;
    case "playing":
      return <GamePhase room={room} players={players} squares={squares} events={events} me={me} />;
    case "finished":
      return (
        <ResultScreen
          room={room}
          players={players}
          squares={squares}
          events={events}
          me={me}
        />
      );
    default:
      return null;
  }
}
