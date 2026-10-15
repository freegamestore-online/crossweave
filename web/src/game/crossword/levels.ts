import { createRng, shuffle } from "./rng";
import { generateGrid, type GridSpec, type Placement } from "./generator";

export interface LevelSpec extends GridSpec {
  /** How many letters are on the wheel. Every word is at most this long. */
  wheel: number;
}

export interface Level {
  id: string;
  letters: string;
  placements: Placement[];
}

/** Stages of rising length. Each pack holds LEVELS_PER_PACK levels, 200 in all. */
export const LEVELS_PER_PACK = 25;
export const PACKS: ReadonlyArray<{ name: string; spec: LevelSpec }> = [
  { name: "Sprout", spec: { wheel: 4, minWords: 3, maxWords: 4, minLength: 3 } },
  { name: "Bud", spec: { wheel: 4, minWords: 4, maxWords: 5, minLength: 3 } },
  { name: "Stem", spec: { wheel: 5, minWords: 4, maxWords: 5, minLength: 3 } },
  { name: "Leaf", spec: { wheel: 5, minWords: 5, maxWords: 6, minLength: 3 } },
  { name: "Branch", spec: { wheel: 6, minWords: 5, maxWords: 6, minLength: 3 } },
  { name: "Bloom", spec: { wheel: 6, minWords: 6, maxWords: 7, minLength: 3 } },
  { name: "Canopy", spec: { wheel: 7, minWords: 6, maxWords: 7, minLength: 3 } },
  { name: "Grove", spec: { wheel: 7, minWords: 7, maxWords: 8, minLength: 3 } },
];

/** The daily puzzle uses its own spec: a six-letter wheel. */
export const DAILY_SPEC: LevelSpec = { wheel: 6, minWords: 5, maxWords: 6, minLength: 3 };

const MAX_ATTEMPTS = 50;

/**
 * Makes the level for an id. The id seeds every random choice, so the same id and
 * dictionary always give the same level. The wheel is the letters of a dictionary word
 * of the spec's length, shuffled. The grid is then built from the words that wheel spells.
 */
export function makeLevel(id: string, dictionary: ReadonlySet<string>, spec: LevelSpec): Level {
  const rng = createRng(id);
  const seeds = [...dictionary].filter((w) => w.length === spec.wheel);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const seedWord = seeds[Math.floor(rng() * seeds.length)]!;
    const letters = shuffle([...seedWord], rng).join("");
    const placements = generateGrid(letters, dictionary, rng, spec);
    if (placements) return { id, letters, placements };
  }
  throw new Error(`No level could be built for ${id}`);
}

/** Level `index` (0-based) of pack `packIndex`. */
export function packLevel(packIndex: number, index: number, dictionary: ReadonlySet<string>): Level {
  const pack = PACKS[packIndex];
  if (!pack) throw new Error(`No pack ${packIndex}`);
  return makeLevel(`${pack.name}:${index + 1}`, dictionary, pack.spec);
}

/** The UTC calendar date as YYYY-MM-DD. The daily puzzle changes at UTC midnight. */
export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dailyLevel(date: Date, dictionary: ReadonlySet<string>): Level {
  return makeLevel(`daily:${utcDateKey(date)}`, dictionary, DAILY_SPEC);
}
