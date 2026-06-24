import type { Landing, Player, Square } from "@/types/game";
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
  /** Total applause this player received across all their landings. */
  claps: number;
  /** This player's landings, most-clapped (most exciting) first. */
  landings: Landing[];
}

export interface ResultSummary {
  ranking: PlayerResult[];
  /** The single most-clapped landing of the whole game. */
  hottestLanding: Landing | null;
}

/**
 * Final standings are decided by applause: the player whose landings drew the
 * most claps wins — not goal-arrival order. Ties share a rank.
 */
export function computeResults(players: Player[], landings: Landing[]): ResultSummary {
  const byPlayer = new Map<string, Landing[]>();
  for (const l of landings) {
    if (!l.player_id) continue;
    const arr = byPlayer.get(l.player_id) ?? [];
    arr.push(l);
    byPlayer.set(l.player_id, arr);
  }

  const ranked = players
    .map((player) => {
      const mine = (byPlayer.get(player.id) ?? [])
        .slice()
        .sort(
          (a, b) =>
            (b.claps ?? 0) - (a.claps ?? 0) || a.created_at.localeCompare(b.created_at),
        );
      const claps = mine.reduce((sum, l) => sum + (l.claps ?? 0), 0);
      return { player, claps, landings: mine };
    })
    .sort((a, b) => b.claps - a.claps || a.player.name.localeCompare(b.player.name));

  const ranking: PlayerResult[] = [];
  let prevClaps: number | null = null;
  let rank = 0;
  ranked.forEach((r, i) => {
    if (prevClaps === null || r.claps !== prevClaps) {
      rank = i + 1;
      prevClaps = r.claps;
    }
    ranking.push({ player: r.player, rank, claps: r.claps, landings: r.landings });
  });

  let hottestLanding: Landing | null = null;
  for (const l of landings) {
    if (!hottestLanding || (l.claps ?? 0) > (hottestLanding.claps ?? 0)) hottestLanding = l;
  }
  if (hottestLanding && (hottestLanding.claps ?? 0) <= 0) hottestLanding = null;

  return { ranking, hottestLanding };
}
