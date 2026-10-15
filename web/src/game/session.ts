import { MIN_WORD_LENGTH } from "./crossword/solver";
import type { Level } from "./crossword/levels";
import { layoutGrid, wordCells } from "./grid";

/** One hint is earned for every this many bonus words. */
export const BONUS_PER_HINT = 3;

/** What one played word did. */
export type WordResult =
  /** A word from the grid, now revealed. */
  | "slot"
  /** A valid word that is not in the grid. It goes to the bonus jar. */
  | "bonus"
  /** A word already found or in the jar. */
  | "repeat"
  /** Too short, or not a word. */
  | "unknown";

export interface Session {
  level: Level;
  /** Grid words the player has revealed. */
  found: ReadonlySet<string>;
  /** Valid words outside the grid. */
  bonus: ReadonlySet<string>;
  /** Cells revealed by hints, keyed like grid cells. */
  hintCells: ReadonlySet<string>;
  hintsUsed: number;
}

/** The part of a session that is saved between visits. */
export interface SessionRecord {
  found: string[];
  bonus: string[];
  hintCells: string[];
  hintsUsed: number;
}

export function newSession(level: Level): Session {
  return { level, found: new Set(), bonus: new Set(), hintCells: new Set(), hintsUsed: 0 };
}

/** Rebuilds a session from its saved record. Words that are not in this level are dropped. */
export function restoreSession(level: Level, record: SessionRecord | undefined): Session {
  if (!record) return newSession(level);
  const inGrid = new Set(level.placements.map((p) => p.word));
  const layout = layoutGrid(level.placements);
  const cells = new Set([...layout.cells.keys()]);
  return {
    level,
    found: new Set(record.found.filter((w) => inGrid.has(w))),
    bonus: new Set(record.bonus),
    hintCells: new Set(record.hintCells.filter((c) => cells.has(c))),
    hintsUsed: Math.max(0, Math.floor(record.hintsUsed)),
  };
}

export function toRecord(session: Session): SessionRecord {
  return {
    found: [...session.found],
    bonus: [...session.bonus],
    hintCells: [...session.hintCells],
    hintsUsed: session.hintsUsed,
  };
}

/**
 * Plays a word. `validWords` is the validation list, so a player can make any valid word,
 * not only the grid's. Returns the new session and what happened.
 */
export function playWord(
  session: Session,
  word: string,
  validWords: ReadonlySet<string>,
): { session: Session; result: WordResult } {
  if (word.length < MIN_WORD_LENGTH) return { session, result: "unknown" };
  const inGrid = session.level.placements.some((p) => p.word === word);
  if (inGrid) {
    if (session.found.has(word)) return { session, result: "repeat" };
    return { session: { ...session, found: new Set([...session.found, word]) }, result: "slot" };
  }
  if (session.bonus.has(word)) return { session, result: "repeat" };
  if (validWords.has(word)) {
    return { session: { ...session, bonus: new Set([...session.bonus, word]) }, result: "bonus" };
  }
  return { session, result: "unknown" };
}

/** Hints earned from bonus words and not yet used. Hints are never bought. */
export function hintsAvailable(session: Session): number {
  return Math.floor(session.bonus.size / BONUS_PER_HINT) - session.hintsUsed;
}

/**
 * Reveals one letter of an unsolved word: the first hidden cell of the first unfound word,
 * in a fixed order. Returns null when no hint is available or nothing is left to reveal.
 */
export function spendHint(session: Session): Session | null {
  if (hintsAvailable(session) <= 0) return null;
  const layout = layoutGrid(session.level.placements);
  const shown = (cell: string) =>
    session.hintCells.has(cell) || (layout.cells.get(cell)?.words ?? []).some((w) => session.found.has(w));
  const unsolved = session.level.placements
    .filter((p) => !session.found.has(p.word))
    .sort((a, b) => a.word.localeCompare(b.word));
  for (const placement of unsolved) {
    const hidden = wordCells(placement, layout).find((cell) => !shown(cell));
    if (hidden) {
      return { ...session, hintCells: new Set([...session.hintCells, hidden]), hintsUsed: session.hintsUsed + 1 };
    }
  }
  return null;
}

/** A level is solved when every grid word is found. */
export function isSolved(session: Session): boolean {
  return session.found.size === session.level.placements.length;
}
