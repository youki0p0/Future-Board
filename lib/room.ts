import type {
  BoardLength,
  EffectType,
  GameEventType,
  PendingState,
  Player,
  Room,
  RoomData,
  RoomState,
  Square,
  Visibility,
} from "@/types/game";
import { requireSupabase } from "@/lib/supabase";
import { clampPosition, goalIndex, squaresPerPlayer } from "@/lib/board";
import { randInt } from "@/lib/effects";
import { shouldEnableLastSpurt, turnOrder } from "@/lib/gameRules";

const MAX_PLAYERS = 8;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous O/0/I/1

const sb = () => requireSupabase();

// ----------------------------------------------------------------------------
// Low-level helpers
// ----------------------------------------------------------------------------

function newCode(len = 4): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

async function patchRoom(roomId: string, fields: Partial<Room>): Promise<void> {
  await sb().from("rooms").update(fields).eq("id", roomId);
}

async function patchPlayer(playerId: string, fields: Partial<Player>): Promise<void> {
  await sb().from("players").update(fields).eq("id", playerId);
}

async function logEvent(
  roomId: string,
  playerId: string | null,
  type: GameEventType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await sb().from("game_events").insert({
    room_id: roomId,
    player_id: playerId,
    event_type: type,
    payload,
  });
}

async function fetchRoom(roomId: string): Promise<Room> {
  const { data } = await sb().from("rooms").select("*").eq("id", roomId).single();
  return data as Room;
}

async function fetchPlayers(roomId: string): Promise<Player[]> {
  const { data } = await sb()
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });
  return (data ?? []) as Player[];
}

async function fetchSquares(roomId: string): Promise<Square[]> {
  const { data } = await sb()
    .from("squares")
    .select("*")
    .eq("room_id", roomId)
    .order("position", { ascending: true });
  return (data ?? []) as Square[];
}

// ----------------------------------------------------------------------------
// Loading + realtime
// ----------------------------------------------------------------------------

export async function loadRoomData(code: string): Promise<RoomData | null> {
  const { data: roomRow } = await sb()
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!roomRow) return null;
  const room = roomRow as Room;

  const [players, squares, eventsRes] = await Promise.all([
    fetchPlayers(room.id),
    fetchSquares(room.id),
    sb()
      .from("game_events")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .limit(200),
  ]);

  return {
    room,
    players,
    squares,
    events: (eventsRes.data ?? []) as RoomData["events"],
  };
}

/** Subscribe to all room-scoped tables. Calls onChange on any mutation. */
export function subscribeRoom(roomId: string, onChange: () => void) {
  const client = sb();
  const channel = client
    .channel(`room:${roomId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "squares", filter: `room_id=eq.${roomId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "game_events", filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe();
  return channel;
}

// ----------------------------------------------------------------------------
// Room lifecycle
// ----------------------------------------------------------------------------

export async function createRoom(
  clientId: string,
  name: string,
  boardLength: BoardLength,
): Promise<{ code: string }> {
  let code = newCode();
  // Retry on the rare code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await sb().from("rooms").select("id").eq("code", code).maybeSingle();
    if (!existing) break;
    code = newCode();
  }

  const { data: roomRow, error } = await sb()
    .from("rooms")
    .insert({
      code,
      status: "lobby",
      host_client_id: clientId,
      board_length: boardLength,
      setup_squares_per_player: squaresPerPlayer(boardLength),
      turn_index: 0,
      last_spurt_enabled: false,
      state: {},
    })
    .select()
    .single();
  if (error || !roomRow) throw new Error(error?.message ?? "ルーム作成に失敗しました");

  const room = roomRow as Room;
  await sb().from("players").insert({
    room_id: room.id,
    client_id: clientId,
    name: name || "ホスト",
    position: 0,
    is_ready: false,
    skip_next_turn: false,
    score: 0,
  });

  return { code };
}

export async function joinRoom(
  clientId: string,
  code: string,
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: roomRow } = await sb()
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!roomRow) return { ok: false, error: "ルームが見つかりません" };
  const room = roomRow as Room;

  const players = await fetchPlayers(room.id);
  const mine = players.find((p) => p.client_id === clientId);
  if (mine) return { ok: true }; // already joined → allow re-entry

  if (room.status !== "lobby") return { ok: false, error: "このゲームは既に開始しています" };
  if (players.length >= MAX_PLAYERS) return { ok: false, error: "満員です (最大8人)" };

  const { error } = await sb().from("players").insert({
    room_id: room.id,
    client_id: clientId,
    name: name || `Player ${players.length + 1}`,
    position: 0,
    is_ready: false,
    skip_next_turn: false,
    score: 0,
  });
  if (error) return { ok: false, error: error.message };

  await logEvent(room.id, null, "join", { name });
  return { ok: true };
}

export async function renamePlayer(playerId: string, name: string): Promise<void> {
  await patchPlayer(playerId, { name });
}

export async function setReady(playerId: string, ready: boolean): Promise<void> {
  await patchPlayer(playerId, { is_ready: ready });
}

export async function setBoardLength(roomId: string, boardLength: BoardLength): Promise<void> {
  await patchRoom(roomId, {
    board_length: boardLength,
    setup_squares_per_player: squaresPerPlayer(boardLength),
  });
}

export async function startSetup(roomId: string): Promise<void> {
  await patchRoom(roomId, { status: "setup" });
  await logEvent(roomId, null, "start_setup", {});
}

export async function startGame(roomId: string): Promise<void> {
  const order = turnOrder(await fetchPlayers(roomId));
  if (!order.length) return;
  await patchRoom(roomId, {
    status: "playing",
    current_turn_player_id: order[0].id,
    turn_index: 0,
    state: {},
  });
  await logEvent(roomId, order[0].id, "start_game", {});
}

export async function resetGame(roomId: string): Promise<void> {
  const players = await fetchPlayers(roomId);
  await Promise.all(
    players.map((p) =>
      patchPlayer(p.id, { position: 0, is_ready: false, skip_next_turn: false, score: 0 }),
    ),
  );
  await sb().from("squares").delete().eq("room_id", roomId);
  await patchRoom(roomId, {
    status: "lobby",
    current_turn_player_id: null,
    turn_index: 0,
    last_spurt_enabled: false,
    winner_player_id: null,
    state: {},
  });
}

// ----------------------------------------------------------------------------
// Square creation / moderation
// ----------------------------------------------------------------------------

export interface NewSquareInput {
  roomId: string;
  position: number;
  creatorPlayerId: string;
  title: string;
  body: string;
  effectType: EffectType;
  visibility: Visibility;
  createdPhase: "setup" | "last_spurt";
}

export async function createSquare(input: NewSquareInput): Promise<{ ok: boolean; error?: string }> {
  const { error } = await sb().from("squares").insert({
    room_id: input.roomId,
    position: input.position,
    creator_player_id: input.creatorPlayerId,
    title: input.title || "なぞのマス",
    body: input.body,
    effect_type: input.effectType,
    effect_value: {},
    visibility: input.visibility,
    is_revealed: input.visibility === "public",
    created_phase: input.createdPhase,
    revealed_at: input.visibility === "public" ? new Date().toISOString() : null,
  });
  if (error) {
    // Unique (room_id, position) violation → someone took the square first.
    return { ok: false, error: "そのマスは埋まりました。別のマスを選んでください。" };
  }
  return { ok: true };
}

export async function deleteSquare(squareId: string): Promise<void> {
  await sb().from("squares").delete().eq("id", squareId);
}

// ----------------------------------------------------------------------------
// Turn engine
// ----------------------------------------------------------------------------

function withState(room: Room, patch: Partial<RoomState>): RoomState {
  return { ...(room.state ?? {}), ...patch };
}

/** Apply a non-interactive effect, or return a PendingState for interactive ones. */
async function applyEffect(
  room: Room,
  playerId: string,
  landingPos: number,
  square: Square,
): Promise<PendingState | null> {
  const boardLength = room.board_length;
  const players = await fetchPlayers(room.id);
  const me = players.find((p) => p.id === playerId);
  if (!me) return null;

  switch (square.effect_type) {
    case "move_forward": {
      const amount = randInt(1, 3);
      const to = clampPosition(landingPos + amount, boardLength);
      await patchPlayer(playerId, { position: to });
      await logEvent(room.id, playerId, "effect", { effect: "move_forward", amount, to, squareId: square.id });
      return null;
    }
    case "move_backward": {
      const amount = randInt(1, 3);
      const to = clampPosition(landingPos - amount, boardLength);
      await patchPlayer(playerId, { position: to });
      await logEvent(room.id, playerId, "effect", { effect: "move_backward", amount, to, squareId: square.id });
      return null;
    }
    case "skip_turn": {
      await patchPlayer(playerId, { skip_next_turn: true });
      await logEvent(room.id, playerId, "effect", { effect: "skip_turn", squareId: square.id });
      return null;
    }
    case "roll_again": {
      await logEvent(room.id, playerId, "effect", { effect: "roll_again", squareId: square.id });
      return null;
    }
    case "position_swap": {
      const others = players.filter((p) => p.id !== playerId);
      if (!others.length) {
        await logEvent(room.id, playerId, "effect", { effect: "position_swap", noop: true, squareId: square.id });
        return null;
      }
      const target = others[randInt(0, others.length - 1)];
      await patchPlayer(playerId, { position: target.position });
      await patchPlayer(target.id, { position: me.position });
      await logEvent(room.id, playerId, "effect", {
        effect: "position_swap",
        targetId: target.id,
        targetName: target.name,
        squareId: square.id,
      });
      return null;
    }
    case "everyone": {
      const dir = Math.random() < 0.5 ? -1 : 1;
      await Promise.all(
        players.map((p) =>
          patchPlayer(p.id, { position: clampPosition(p.position + dir, boardLength) }),
        ),
      );
      await logEvent(room.id, playerId, "effect", { effect: "everyone", dir, squareId: square.id });
      return null;
    }
    case "vote": {
      await sb().from("votes").insert({
        room_id: room.id,
        square_id: square.id,
        status: "open",
        target_player_id: playerId,
        payload: {},
      });
      await logEvent(room.id, playerId, "effect", { effect: "vote", squareId: square.id });
      return { kind: "vote", playerId, squareId: square.id };
    }
    case "prompt": {
      await logEvent(room.id, playerId, "effect", { effect: "prompt", squareId: square.id });
      return { kind: "prompt", playerId, squareId: square.id };
    }
    case "no_effect":
    default: {
      await logEvent(room.id, playerId, "effect", { effect: "no_effect", squareId: square.id });
      return null;
    }
  }
}

/** Advance to the next eligible player, consuming skip_next_turn flags. */
async function advanceTurn(roomId: string, actingPlayerId: string): Promise<void> {
  const room = await fetchRoom(roomId);
  const order = turnOrder(await fetchPlayers(roomId));
  const n = order.length;
  if (!n) return;

  let idx = order.findIndex((p) => p.id === actingPlayerId);
  if (idx < 0) idx = 0;

  let steps = 1;
  let guard = 0;
  let nextIdx = (idx + steps) % n;
  while (guard < n) {
    const cand = order[nextIdx];
    if (cand.skip_next_turn) {
      await patchPlayer(cand.id, { skip_next_turn: false });
      await logEvent(roomId, cand.id, "skip", {});
      steps += 1;
      nextIdx = (idx + steps) % n;
      guard += 1;
      continue;
    }
    break;
  }

  await patchRoom(roomId, {
    current_turn_player_id: order[nextIdx].id,
    turn_index: room.turn_index + 1,
    state: withState(room, { pending: null }),
  });
}

/** Shared end-of-turn routine: win → last-spurt → placement → advance. */
async function endTurn(roomId: string, actingPlayerId: string): Promise<void> {
  const room = await fetchRoom(roomId);
  const players = await fetchPlayers(roomId);
  const goal = goalIndex(room.board_length);

  const winner = players.find((p) => p.position >= goal);
  if (winner) {
    await logEvent(roomId, winner.id, "win", { position: winner.position });
    await patchRoom(roomId, {
      status: "finished",
      winner_player_id: winner.id,
      current_turn_player_id: null,
      state: withState(room, { pending: null }),
    });
    return;
  }

  let lastSpurt = room.last_spurt_enabled;
  if (!lastSpurt && shouldEnableLastSpurt(players, room.board_length)) {
    lastSpurt = true;
    await patchRoom(roomId, { last_spurt_enabled: true });
    await logEvent(roomId, actingPlayerId, "last_spurt", {});
  }

  if (lastSpurt) {
    // The player who just finished places one extra square before we advance.
    await patchRoom(roomId, {
      state: withState(room, { pending: { kind: "placement", playerId: actingPlayerId } }),
    });
    return;
  }

  await advanceTurn(roomId, actingPlayerId);
}

/** Core action: the current player rolls the dice and resolves the landing. */
export async function takeTurn(room: Room, me: Player): Promise<{ dice: number }> {
  const boardLength = room.board_length;
  const goal = goalIndex(boardLength);
  const dice = randInt(1, 6);
  const from = me.position;
  const to = clampPosition(from + dice, boardLength);

  await patchPlayer(me.id, { position: to });
  await logEvent(room.id, me.id, "roll", { dice, from, to });

  // Reached the goal exactly → win immediately.
  if (to >= goal) {
    await logEvent(room.id, me.id, "win", { position: to });
    await patchRoom(room.id, {
      status: "finished",
      winner_player_id: me.id,
      current_turn_player_id: null,
      state: withState(room, { pending: null, lastSquare: null }),
    });
    return { dice };
  }

  const squares = await fetchSquares(room.id);
  const landing = squares.find((s) => s.position === to) ?? null;

  if (!landing) {
    await patchRoom(room.id, { state: withState(room, { pending: null, lastSquare: null }) });
    await endTurn(room.id, me.id);
    return { dice };
  }

  // Stepped on a square: score, reveal if hidden, then apply the effect.
  await patchPlayer(me.id, { score: me.score + 1 });
  await logEvent(room.id, me.id, "step", { squareId: landing.id, position: to });

  if (!landing.is_revealed) {
    await sb()
      .from("squares")
      .update({ is_revealed: true, visibility: "public", revealed_at: new Date().toISOString() })
      .eq("id", landing.id);
    await logEvent(room.id, me.id, "reveal", { squareId: landing.id });
  }

  const players = await fetchPlayers(room.id);
  const creator = players.find((p) => p.id === landing.creator_player_id);
  const lastSquare = {
    position: to,
    title: landing.title,
    body: landing.body,
    effectType: landing.effect_type,
    creatorName: creator?.name ?? "不明",
  };

  const pending = await applyEffect(room, me.id, to, landing);

  if (pending) {
    await patchRoom(room.id, { state: withState(room, { pending, lastSquare }) });
    return { dice };
  }

  if (landing.effect_type === "roll_again") {
    // Same player keeps the turn and rolls again.
    await patchRoom(room.id, { state: withState(room, { pending: null, lastSquare }) });
    return { dice };
  }

  await patchRoom(room.id, { state: withState(room, { pending: null, lastSquare }) });
  await endTurn(room.id, me.id);
  return { dice };
}

export async function resolvePrompt(room: Room, success: boolean): Promise<void> {
  const pending = room.state?.pending;
  if (!pending || pending.kind !== "prompt") return;
  const delta = success ? 2 : -2;
  const players = await fetchPlayers(room.id);
  const me = players.find((p) => p.id === pending.playerId);
  if (me) {
    await patchPlayer(me.id, { position: clampPosition(me.position + delta, room.board_length) });
  }
  await logEvent(room.id, pending.playerId, "effect", { effect: "prompt_result", success, delta });
  await patchRoom(room.id, { state: withState(room, { pending: null }) });
  await endTurn(room.id, pending.playerId);
}

export async function resolveVote(room: Room, positive: boolean): Promise<void> {
  const pending = room.state?.pending;
  if (!pending || pending.kind !== "vote") return;
  const delta = positive ? 2 : -2;
  const players = await fetchPlayers(room.id);
  const me = players.find((p) => p.id === pending.playerId);
  if (me) {
    await patchPlayer(me.id, { position: clampPosition(me.position + delta, room.board_length) });
  }
  await sb()
    .from("votes")
    .update({ status: "closed", payload: { positive, delta } })
    .eq("square_id", pending.squareId)
    .eq("status", "open");
  await logEvent(room.id, pending.playerId, "effect", { effect: "vote_result", positive, delta });
  await patchRoom(room.id, { state: withState(room, { pending: null }) });
  await endTurn(room.id, pending.playerId);
}

/** Called after a Last-Spurt placement (or skip) to continue the turn order. */
export async function resolvePlacement(room: Room): Promise<void> {
  const pending = room.state?.pending;
  if (!pending || pending.kind !== "placement") return;
  await patchRoom(room.id, { state: withState(room, { pending: null }) });
  await advanceTurn(room.id, pending.playerId);
}
