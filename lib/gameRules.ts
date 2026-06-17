import type { GameEvent, Player, Square } from "@/types/game";
import { goalIndex, LAST_SPURT_RANGE } from "@/lib/board";

/** Stable turn order: by join time, then id as tie-breaker. */
export function turnOrder(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (a.joined_at !== b.joined_at) return a.joined_at < b.joined_at ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
}

export function currentPlayer(players: Player[], currentId: string | null): Player | null {
  if (!currentId) return null;
  return players.find((p) => p.id === currentId) ?? null;
}

export function hasReachedGoal(player: Player, boardLength: number): boolean {
  return player.position >= goalIndex(boardLength);
}

export function findWinner(players: Player[], boardLength: number): Player | null {
  return players.find((p) => hasReachedGoal(p, boardLength)) ?? null;
}

/** True once any player is within LAST_SPURT_RANGE of the goal. */
export function shouldEnableLastSpurt(players: Player[], boardLength: number): boolean {
  const goal = goalIndex(boardLength);
  return players.some((p) => goal - p.position <= LAST_SPURT_RANGE);
}

export function squareAt(squares: Square[], position: number): Square | null {
  return squares.find((s) => s.position === position) ?? null;
}

export function setupComplete(players: Player[], squares: Square[], perPlayer: number): boolean {
  return players.every(
    (p) =>
      squares.filter((s) => s.creator_player_id === p.id && s.created_phase === "setup").length >=
      perPlayer,
  );
}

export function setupCountFor(playerId: string, squares: Square[]): number {
  return squares.filter((s) => s.creator_player_id === playerId && s.created_phase === "setup")
    .length;
}

export interface PlayerResult {
  player: Player;
  rank: number;
  stepped: number; // squares this player stepped on
  ownStepped: number; // times this player's squares were stepped by anyone
}

export interface ResultSummary {
  ranking: PlayerResult[];
  hottestSquare: { square: Square; steps: number } | null;
}

/** Compute end-of-game stats from players, squares and the event log. */
export function computeResults(
  players: Player[],
  squares: Square[],
  events: GameEvent[],
): ResultSummary {
  const stepEvents = events.filter((e) => e.event_type === "step");

  const steppedByPlayer = new Map<string, number>();
  const stepsBySquare = new Map<string, number>();
  for (const e of stepEvents) {
    if (e.player_id) steppedByPlayer.set(e.player_id, (steppedByPlayer.get(e.player_id) ?? 0) + 1);
    const sid = e.payload?.squareId as string | undefined;
    if (sid) stepsBySquare.set(sid, (stepsBySquare.get(sid) ?? 0) + 1);
  }

  const ownStepped = new Map<string, number>();
  for (const [sid, count] of stepsBySquare) {
    const sq = squares.find((s) => s.id === sid);
    if (sq?.creator_player_id) {
      ownStepped.set(sq.creator_player_id, (ownStepped.get(sq.creator_player_id) ?? 0) + count);
    }
  }

  const ranking: PlayerResult[] = [...players]
    .sort((a, b) => b.position - a.position)
    .map((player, i) => ({
      player,
      rank: i + 1,
      stepped: steppedByPlayer.get(player.id) ?? 0,
      ownStepped: ownStepped.get(player.id) ?? 0,
    }));

  let hottestSquare: ResultSummary["hottestSquare"] = null;
  let max = 0;
  for (const [sid, steps] of stepsBySquare) {
    if (steps > max) {
      const sq = squares.find((s) => s.id === sid);
      if (sq) {
        hottestSquare = { square: sq, steps };
        max = steps;
      }
    }
  }

  return { ranking, hottestSquare };
}
