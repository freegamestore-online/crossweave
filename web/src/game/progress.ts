import { LEVELS_PER_PACK, PACKS } from "./crossword/levels";

/** Where the player is: a pack and a level within it, both 0-based. */
export interface Progress {
  pack: number;
  level: number;
}

export const PROGRESS_KEY = "crossweave:progress";
const START: Progress = { pack: 0, level: 0 };

function isValid(value: unknown): value is Progress {
  if (typeof value !== "object" || value === null) return false;
  const { pack, level } = value as Progress;
  return (
    Number.isInteger(pack) &&
    Number.isInteger(level) &&
    pack >= 0 &&
    pack < PACKS.length &&
    level >= 0 &&
    level < LEVELS_PER_PACK
  );
}

/** Saved progress, or the first level when there is none or it is unreadable. */
export function loadProgress(storage: Pick<Storage, "getItem"> = localStorage): Progress {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(PROGRESS_KEY) ?? "null");
    return isValid(parsed) ? parsed : START;
  } catch {
    return START;
  }
}

export function saveProgress(progress: Progress, storage: Pick<Storage, "setItem"> = localStorage): void {
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage can be full or blocked. The player keeps playing; only the save is lost.
  }
}

/** The level after this one, moving on to the next pack at the end of a pack. Null after the last level. */
export function nextProgress({ pack, level }: Progress): Progress | null {
  if (level + 1 < LEVELS_PER_PACK) return { pack, level: level + 1 };
  if (pack + 1 < PACKS.length) return { pack: pack + 1, level: 0 };
  return null;
}
