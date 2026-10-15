import { forwardRef, useMemo } from "react";
import type { Level } from "../game/crossword/levels";
import { cellKey, layoutGrid } from "../game/grid";

interface CrosswordGridProps {
  level: Level;
  found: ReadonlySet<string>;
  /** Cells revealed by hints. */
  hintCells: ReadonlySet<string>;
}

/**
 * The crossword. A cell shows its letter once any word that covers it is found, or a hint reveals it. Each shown
 * cell has data-cell="row,col", so the board can aim effects at it.
 */
export const CrosswordGrid = forwardRef<HTMLDivElement, CrosswordGridProps>(function CrosswordGrid(
  { level, found, hintCells },
  ref,
) {
  const layout = useMemo(() => layoutGrid(level.placements), [level]);

  const rows = [];
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      const key = cellKey(row, col);
      const cell = layout.cells.get(key);
      if (!cell) {
        rows.push(<div key={key} className="cell-gap" />);
        continue;
      }
      const shown = hintCells.has(key) || cell.words.some((w) => found.has(w));
      rows.push(
        <div key={key} data-cell={key} className={shown ? "cell reveal" : "cell"}>
          {shown ? cell.letter : ""}
        </div>,
      );
    }
  }

  return (
    <div
      ref={ref}
      className="grid-board"
      role="img"
      aria-label={`Crossword, ${found.size} of ${level.placements.length} words found`}
      style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}
    >
      {rows}
    </div>
  );
});
