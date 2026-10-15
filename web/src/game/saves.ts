import type { SessionRecord } from "./session";

/** Everything the player keeps between visits, per level id. */
export interface SavedLevels {
  levels: Record<string, SessionRecord & { solved?: boolean }>;
  /** Daily puzzles: the time the first attempt started and, once solved, how long it took. */
  daily: Record<string, { startedAt: number; solvedMs?: number; submitted?: boolean }>;
}

export const SAVES_KEY = "crossweave:saves";

const EMPTY: SavedLevels = { levels: {}, daily: {} };

function isRecord(value: unknown): value is SessionRecord {
  if (typeof value !== "object" || value === null) return false;
  const r = value as SessionRecord;
  return (
    Array.isArray(r.found) &&
    r.found.every((w) => typeof w === "string") &&
    Array.isArray(r.bonus) &&
    r.bonus.every((w) => typeof w === "string") &&
    Array.isArray(r.hintCells) &&
    r.hintCells.every((c) => typeof c === "string") &&
    Number.isFinite(r.hintsUsed)
  );
}

/** Saved state, or an empty record when there is none or it is unreadable. Bad entries are dropped. */
export function loadSaves(storage: Pick<Storage, "getItem"> = localStorage): SavedLevels {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(SAVES_KEY) ?? "null");
    if (typeof parsed !== "object" || parsed === null) return EMPTY;
    const { levels = {}, daily = {} } = parsed as Partial<SavedLevels>;
    const cleanLevels: SavedLevels["levels"] = {};
    for (const [id, value] of Object.entries(levels)) if (isRecord(value)) cleanLevels[id] = value;
    const cleanDaily: SavedLevels["daily"] = {};
    for (const [id, value] of Object.entries(daily)) {
      if (typeof value?.startedAt === "number") cleanDaily[id] = value;
    }
    return { levels: cleanLevels, daily: cleanDaily };
  } catch {
    return EMPTY;
  }
}

export function saveSaves(saves: SavedLevels, storage: Pick<Storage, "setItem"> = localStorage): void {
  try {
    storage.setItem(SAVES_KEY, JSON.stringify(saves));
  } catch {
    // Storage full or blocked: play on, and lose only this save.
  }
}

/** Above this many milliseconds a daily time scores zero. */
const DAILY_SCORE_CEILING_MS = 10_000_000;

/**
 * The leaderboard ranks higher scores better, and a daily time is better when it is lower.
 * So a time is turned into a score that falls as the time grows, and never goes below zero.
 */
export function dailyScore(ms: number): number {
  return Math.max(0, Math.round(DAILY_SCORE_CEILING_MS - ms));
}
