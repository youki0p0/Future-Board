"use client";

// ============================================================================
// CPU (single-player test mode) — REMOVE BEFORE RELEASE.
// ----------------------------------------------------------------------------
// Lets one human test every phase alone. The HOST browser drives all CPU
// players: it auto-fills their setup squares, takes their turns, and resolves
// their interactive prompts/votes/placements. No schema change is needed —
// CPU players are just rows whose client_id starts with "cpu:".
// ============================================================================

import { useEffect, useRef } from "react";
import type { Player, Room, RoomData, Square } from "@/types/game";
import { lastSpurtCandidates, setupCandidates } from "@/lib/board";
import { setupCountFor } from "@/lib/gameRules";
import {
  createSquare,
  requireSupabaseInsertCpu,
  resolvePlacement,
  resolvePrompt,
  resolveVote,
  takeTurn,
} from "@/lib/room";
import type { EffectType } from "@/types/game";

/** Master switch for the test-only CPU feature. Set to false (or delete) at release. */
export const CPU_TEST_MODE = true;

const CPU_PREFIX = "cpu:";
const ACTION_DELAY_MS = 700;

export function isCpu(player: Player): boolean {
  return player.client_id.startsWith(CPU_PREFIX);
}

export function cpuCount(players: Player[]): number {
  return players.filter(isCpu).length;
}

const SAFE_EFFECTS: EffectType[] = [
  "no_effect",
  "move_forward",
  "move_backward",
  "skip_turn",
  "roll_again",
  "everyone",
  "prompt",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cpuSquareTitle(bot: Player, players: Player[]): string {
  const others = players.filter((p) => p.id !== bot.id);
  const someone = others.length ? pick(others).name : "となりの人";
  return pick([
    `${someone}の真似をする`,
    `${someone}の好きな食べ物を当てる`,
    "変な顔を3秒キープ",
    "ここで一句よむ",
    "全力でガッツポーズ",
    "好きな曲をワンフレーズ歌う",
    "モノマネをひとつ",
  ]);
}

export async function addCpuPlayer(roomId: string, index: number): Promise<void> {
  const clientId = `${CPU_PREFIX}${crypto.randomUUID()}`;
  await requireSupabaseInsertCpu(roomId, clientId, `CPU-${index}`);
}

async function cpuCreateSetupSquare(
  room: Room,
  bot: Player,
  players: Player[],
  squares: Square[],
): Promise<void> {
  const cands = setupCandidates(room.board_length, squares, 1);
  if (!cands.length) return;
  await createSquare({
    roomId: room.id,
    position: cands[0],
    creatorPlayerId: bot.id,
    title: cpuSquareTitle(bot, players),
    body: "",
    effectType: pick(SAFE_EFFECTS),
    visibility: "hidden",
    createdPhase: "setup",
  });
}

async function cpuPlacement(room: Room, bot: Player, players: Player[], squares: Square[]): Promise<void> {
  const cands = lastSpurtCandidates(room.board_length, bot.position, squares);
  if (cands.length && Math.random() < 0.7) {
    await createSquare({
      roomId: room.id,
      position: pick(cands),
      creatorPlayerId: bot.id,
      title: cpuSquareTitle(bot, players),
      body: "",
      effectType: pick(SAFE_EFFECTS),
      visibility: "hidden",
      createdPhase: "last_spurt",
    });
  }
  await resolvePlacement(room);
}

/** Decide the next CPU action for the current state, or null if none is due. */
function decideCpuAction(data: RoomData): (() => Promise<void>) | null {
  const { room, players, squares } = data;

  if (room.status === "setup") {
    const bot = players.find(
      (p) => isCpu(p) && setupCountFor(p.id, squares) < room.setup_squares_per_player,
    );
    if (bot) return () => cpuCreateSetupSquare(room, bot, players, squares);
    return null;
  }

  if (room.status === "playing") {
    const pending = room.state?.pending ?? null;
    if (pending && "playerId" in pending) {
      const owner = players.find((p) => p.id === pending.playerId);
      if (owner && isCpu(owner)) {
        if (pending.kind === "prompt") return () => resolvePrompt(room, Math.random() < 0.6);
        if (pending.kind === "vote") return () => resolveVote(room, Math.random() < 0.5);
        if (pending.kind === "placement") return () => cpuPlacement(room, owner, players, squares);
      }
      return null; // pending belongs to a human → wait
    }
    const turn = players.find((p) => p.id === room.current_turn_player_id);
    if (turn && isCpu(turn)) return () => takeTurn(room, turn).then(() => undefined);
    return null;
  }

  return null;
}

/**
 * Host-only effect that auto-plays all CPU players. Safe to mount for everyone:
 * it no-ops unless the local player is the host and CPUs are present.
 */
export function useCpuDriver(data: RoomData | null, me: Player | null): void {
  const acting = useRef(false);

  useEffect(() => {
    if (!CPU_TEST_MODE || !data || !me) return;
    if (me.client_id !== data.room.host_client_id) return; // only the host drives
    if (cpuCount(data.players) === 0) return;
    if (acting.current) return;

    const action = decideCpuAction(data);
    if (!action) return;

    acting.current = true;
    const id = setTimeout(async () => {
      try {
        await action();
      } catch {
        /* transient; next realtime refresh re-evaluates */
      } finally {
        acting.current = false;
      }
    }, ACTION_DELAY_MS);

    return () => clearTimeout(id);
  }, [data, me]);
}
