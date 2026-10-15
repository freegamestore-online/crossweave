import { MIN_WORD_LENGTH } from "./crossword/solver";
import type { Level } from "./crossword/levels";

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
}

export function newSession(level: Level): Session {
  return { level, found: new Set(), bonus: new Set() };
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

/** A level is solved when every grid word is found. */
export function isSolved(session: Session): boolean {
  return session.found.size === session.level.placements.length;
}
