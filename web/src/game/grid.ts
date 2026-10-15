import type { Placement } from "./crossword/generator";

export interface GridCell {
  letter: string;
  /** The grid words that cover this cell. A cell can be in two words, across and down. */
  words: string[];
}

export interface GridLayout {
  rows: number;
  cols: number;
  /** The board's top-left in the generator's coordinates. */
  origin: { row: number; col: number };
  /** Cells keyed by cellKey(), counted from the top-left at 0, 0. */
  cells: Map<string, GridCell>;
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/** Puts the placements into a grid that starts at 0, 0, so the board can be drawn row by row. */
export function layoutGrid(placements: readonly Placement[]): GridLayout {
  const origin = {
    row: Math.min(...placements.map((p) => p.row)),
    col: Math.min(...placements.map((p) => p.col)),
  };
  const cells = new Map<string, GridCell>();
  let rows = 0;
  let cols = 0;
  for (const p of placements) {
    for (let k = 0; k < p.word.length; k++) {
      const row = p.row - origin.row + (p.dir === "down" ? k : 0);
      const col = p.col - origin.col + (p.dir === "across" ? k : 0);
      rows = Math.max(rows, row + 1);
      cols = Math.max(cols, col + 1);
      const key = cellKey(row, col);
      const cell = cells.get(key) ?? { letter: p.word[k]!, words: [] };
      cell.words.push(p.word);
      cells.set(key, cell);
    }
  }
  return { rows, cols, origin, cells };
}

/** The cell where a placed word starts, counted from the grid's top-left. */
export function startCell(placement: Placement, layout: GridLayout): string {
  return cellKey(placement.row - layout.origin.row, placement.col - layout.origin.col);
}

/** The cells a placed word covers, counted from the grid's top-left, in order. */
export function wordCells(placement: Placement, layout: GridLayout): string[] {
  return [...placement.word].map((_, k) =>
    cellKey(
      placement.row - layout.origin.row + (placement.dir === "down" ? k : 0),
      placement.col - layout.origin.col + (placement.dir === "across" ? k : 0),
    ),
  );
}
