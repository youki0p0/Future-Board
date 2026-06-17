import type { BoardLength, Square } from "@/types/game";

export const BOARD_OPTIONS: { value: BoardLength; label: string; squaresPerPlayer: number }[] = [
  { value: 30, label: "短め (30マス)", squaresPerPlayer: 2 },
  { value: 40, label: "標準 (40マス)", squaresPerPlayer: 3 },
  { value: 50, label: "長め (50マス)", squaresPerPlayer: 4 },
];

export const LAST_SPURT_RANGE = 10;

export function squaresPerPlayer(boardLength: BoardLength): number {
  return BOARD_OPTIONS.find((o) => o.value === boardLength)?.squaresPerPlayer ?? 3;
}

/** Goal is the last index on the board. Start square is index 0. */
export function goalIndex(boardLength: number): number {
  return boardLength - 1;
}

export function clampPosition(pos: number, boardLength: number): number {
  return Math.max(0, Math.min(pos, goalIndex(boardLength)));
}

/** Positions that may hold a player-created square: everything except start and goal. */
export function placeablePositions(boardLength: number): number[] {
  const out: number[] = [];
  for (let i = 1; i < goalIndex(boardLength); i++) out.push(i);
  return out;
}

export function occupiedPositions(squares: Square[]): Set<number> {
  return new Set(squares.map((s) => s.position));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Candidate positions offered to a player during the setup phase.
 * Returns up to `count` free positions, spread across the board.
 */
export function setupCandidates(boardLength: number, squares: Square[], count: number): number[] {
  const taken = occupiedPositions(squares);
  const free = placeablePositions(boardLength).filter((p) => !taken.has(p));
  if (free.length <= count) return free;

  // Spread candidates across evenly-sized bands so choices feel distributed.
  const bands: number[][] = Array.from({ length: count }, () => []);
  const bandSize = Math.ceil(boardLength / count);
  for (const p of free) {
    const idx = Math.min(count - 1, Math.floor(p / bandSize));
    bands[idx].push(p);
  }
  const picks: number[] = [];
  for (const band of bands) {
    if (band.length) picks.push(band[Math.floor(Math.random() * band.length)]);
  }
  // Top up from remaining free positions if some bands were empty.
  if (picks.length < count) {
    const remaining = shuffle(free.filter((p) => !picks.includes(p)));
    for (const p of remaining) {
      if (picks.length >= count) break;
      picks.push(p);
    }
  }
  return picks.sort((a, b) => a - b).slice(0, count);
}

/**
 * Candidate positions for a Last-Spurt extra placement, based on the placing
 * player's current position: +3, +5, and a random empty square.
 */
export function lastSpurtCandidates(
  boardLength: number,
  fromPosition: number,
  squares: Square[],
): number[] {
  const taken = occupiedPositions(squares);
  const goal = goalIndex(boardLength);
  const candidates: number[] = [];

  for (const delta of [3, 5]) {
    const p = fromPosition + delta;
    if (p > 0 && p < goal && !taken.has(p)) candidates.push(p);
  }

  const free = placeablePositions(boardLength).filter(
    (p) => !taken.has(p) && !candidates.includes(p),
  );
  if (free.length) candidates.push(free[Math.floor(Math.random() * free.length)]);

  return Array.from(new Set(candidates)).sort((a, b) => a - b);
}
