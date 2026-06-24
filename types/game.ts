// Core domain types for Future Board by Project MAKINA.

// Aligned with the shared room-matching spec (see StellarBurst):
// 'waiting' is the joinable pre-game state. 'setup' is Future Board specific.
export type RoomStatus = "waiting" | "setup" | "playing" | "finished";
export type Visibility = "hidden" | "public";
export type CreatedPhase = "setup" | "last_spurt";

export type EffectType =
  | "no_effect"
  | "move_forward"
  | "move_backward"
  | "skip_turn"
  | "roll_again"
  | "position_swap"
  | "vote"
  | "everyone"
  | "prompt";

export type BoardLength = 30 | 40 | 50;

// Pending interactive state stored in rooms.state JSON.
export type PendingState =
  | { kind: "prompt"; playerId: string; squareId: string }
  | { kind: "vote"; playerId: string; squareId: string }
  | { kind: "placement"; playerId: string };

export interface LastSquareView {
  position: number;
  title: string;
  body: string;
  effectType: EffectType;
  creatorName: string;
  /** Name of the player who just landed on (stopped at) this square. */
  landedByName: string;
}

export interface RoomState {
  pending?: PendingState | null;
  lastSquare?: LastSquareView | null;
}

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  host_client_id: string;
  board_length: BoardLength;
  setup_squares_per_player: number;
  current_turn_player_id: string | null;
  turn_index: number;
  last_spurt_enabled: boolean;
  winner_player_id: string | null;
  seed: string;
  version: number;
  state: RoomState;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  client_id: string;
  name: string;
  position: number;
  is_ready: boolean;
  skip_next_turn: boolean;
  is_cpu: boolean;
  score: number;
  joined_at: string;
  updated_at: string;
}

export interface Square {
  id: string;
  room_id: string;
  position: number;
  creator_player_id: string | null;
  title: string;
  body: string;
  effect_type: EffectType;
  effect_value: Record<string, unknown> | null;
  visibility: Visibility;
  is_revealed: boolean;
  created_phase: CreatedPhase;
  created_at: string;
  revealed_at: string | null;
}

export type GameEventType =
  | "join"
  | "leave"
  | "start_setup"
  | "start_game"
  | "roll"
  | "step"
  | "reveal"
  | "effect"
  | "skip"
  | "last_spurt"
  | "placement"
  | "win";

export interface GameEvent {
  id: string;
  room_id: string;
  player_id: string | null;
  event_type: GameEventType;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Vote {
  id: string;
  room_id: string;
  square_id: string | null;
  status: string;
  target_player_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface RoomData {
  room: Room;
  players: Player[];
  squares: Square[];
  events: GameEvent[];
}

// Structured join result (machine error codes), aligned with the shared
// room-matching spec. The UI maps each code to a localized message.
export type JoinError =
  | "not_configured"
  | "not_found"
  | "in_progress"
  | "full"
  | "join_failed";

export type JoinResult =
  | { ok: true; roomId: string; playerId: string }
  | { ok: false; error: JoinError; roomId?: string };
