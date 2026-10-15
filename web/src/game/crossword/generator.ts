import { shuffle } from "./rng";
import { solve } from "./solver";

export type Direction = "across" | "down";

export interface Placement {
  word: string;
  row: number;
  col: number;
  dir: Direction;
}

export interface GridSpec {
  minWords: number;
  maxWords: number;
  minLength: number;
}

const STEP: Record<Direction, [number, number]> = {
  across: [0, 1],
  down: [1, 0],
};
const CROSS: Record<Direction, Direction> = { across: "down", down: "across" };

interface Cell {
  letter: string;
  dirs: Set<Direction>;
}

/** A grid under construction. Words only ever cross an existing word, so the grid stays connected. */
class Grid {
  readonly cells = new Map<string, Cell>();
  readonly placements: Placement[] = [];

  at(row: number, col: number): Cell | undefined {
    return this.cells.get(`${row},${col}`);
  }

  /**
   * A word fits at (row, col) when it crosses at least one existing letter, the cells
   * before and after it are empty, and no new letter touches a letter from another word.
   */
  fits(word: string, row: number, col: number, dir: Direction): boolean {
    const [dr, dc] = STEP[dir];
    const [pr, pc] = STEP[CROSS[dir]];
    if (this.at(row - dr, col - dc) || this.at(row + dr * word.length, col + dc * word.length)) {
      return false;
    }
    let crossings = 0;
    for (let k = 0; k < word.length; k++) {
      const r = row + dr * k;
      const c = col + dc * k;
      const cell = this.at(r, c);
      if (cell) {
        if (cell.letter !== word[k] || cell.dirs.has(dir)) return false;
        crossings++;
      } else if (this.at(r + pr, c + pc) || this.at(r - pr, c - pc)) {
        return false;
      }
    }
    return crossings > 0;
  }

  place(word: string, row: number, col: number, dir: Direction): void {
    const [dr, dc] = STEP[dir];
    for (let k = 0; k < word.length; k++) {
      const key = `${row + dr * k},${col + dc * k}`;
      const cell = this.cells.get(key);
      if (cell) cell.dirs.add(dir);
      else this.cells.set(key, { letter: word[k]!, dirs: new Set([dir]) });
    }
    this.placements.push({ word, row, col, dir });
  }
}

/** Finds every legal spot where the word crosses a placed word, and picks one at random. */
function findSpot(grid: Grid, word: string, rng: () => number): Omit<Placement, "word"> | null {
  const spots: Omit<Placement, "word">[] = [];
  for (const placed of grid.placements) {
    const [dr, dc] = STEP[placed.dir];
    const dir = CROSS[placed.dir];
    const [ir, ic] = STEP[dir];
    for (let k = 0; k < placed.word.length; k++) {
      for (let j = 0; j < word.length; j++) {
        if (placed.word[k] !== word[j]) continue;
        const row = placed.row + dr * k - ir * j;
        const col = placed.col + dc * k - ic * j;
        if (grid.fits(word, row, col, dir)) spots.push({ row, col, dir });
      }
    }
  }
  return spots.length === 0 ? null : spots[Math.floor(rng() * spots.length)]!;
}

/**
 * Builds a crossword from the letters, using only dictionary words that can be spelled
 * from them. Returns null when it cannot reach spec.minWords.
 */
export function generateGrid(
  letters: string,
  dictionary: Iterable<string>,
  rng: () => number,
  spec: GridSpec,
): Placement[] | null {
  const candidates = solve(letters, dictionary).filter((w) => w.length >= spec.minLength);
  if (candidates.length === 0) return null;

  const grid = new Grid();
  const used = new Set<string>();
  // Start with a longest word, across, so the grid has room to grow.
  const first = shuffle(candidates, rng).reduce((a, b) => (b.length > a.length ? b : a));
  grid.place(first, 0, 0, "across");
  used.add(first);

  let progress = true;
  while (progress && grid.placements.length < spec.maxWords) {
    progress = false;
    for (const word of shuffle(candidates, rng)) {
      if (used.has(word)) continue;
      const spot = findSpot(grid, word, rng);
      if (!spot) continue;
      grid.place(word, spot.row, spot.col, spot.dir);
      used.add(word);
      progress = true;
      if (grid.placements.length >= spec.maxWords) break;
    }
  }
  return grid.placements.length >= spec.minWords ? grid.placements : null;
}
