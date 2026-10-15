import { describe, expect, it } from "vitest";
import { hintsAvailable, isSolved, newSession, playWord, restoreSession, toRecord, spendHint, BONUS_PER_HINT } from "./session";
import { packLevel } from "./crossword/levels";
import { loadCommon } from "./crossword/helpers";
import { layoutGrid, wordCells } from "./grid";
import { dailyScore, loadSaves, saveSaves, SAVES_KEY } from "./saves";

const dictionary = loadCommon();
const level = packLevel(3, 4, dictionary);

/** A bonus-word session: enough valid words to earn `hints` hints, none of them in the grid. */
function withBonus(count: number) {
  const inGrid = new Set(level.placements.map((p) => p.word));
  const extra = [...dictionary].filter((w) => w.length === 3 && !inGrid.has(w)).slice(0, count);
  const valid = new Set(extra);
  return extra.reduce((s, w) => playWord(s, w, valid).session, newSession(level));
}

describe("hints", () => {
  it("earns one hint for every few bonus words", () => {
    expect(hintsAvailable(withBonus(BONUS_PER_HINT - 1))).toBe(0);
    expect(hintsAvailable(withBonus(BONUS_PER_HINT))).toBe(1);
  });

  it("reveals one hidden letter of an unsolved word, and spends the hint", () => {
    const session = withBonus(BONUS_PER_HINT);
    const hinted = spendHint(session)!;
    expect(hinted.hintCells.size).toBe(1);
    expect(hinted.hintsUsed).toBe(1);
    expect(hintsAvailable(hinted)).toBe(0);
    expect(spendHint(hinted)).toBeNull();
  });

  it("only reveals cells of words the player has not found", () => {
    const session = withBonus(BONUS_PER_HINT);
    const hinted = spendHint(session)!;
    const [cell] = [...hinted.hintCells];
    const layout = layoutGrid(level.placements);
    const owners = layout.cells.get(cell!)!.words;
    expect(owners.some((w) => session.found.has(w))).toBe(false);
  });

  it("does nothing when every word is found", () => {
    let session = withBonus(BONUS_PER_HINT * 2);
    for (const p of level.placements) session = playWord(session, p.word, dictionary).session;
    expect(isSolved(session)).toBe(true);
    expect(spendHint(session)).toBeNull();
  });

  it("covers every cell of a word in order", () => {
    const layout = layoutGrid(level.placements);
    const cells = wordCells(level.placements[0]!, layout);
    expect(cells).toHaveLength(level.placements[0]!.word.length);
    expect(new Set(cells).size).toBe(cells.length);
  });
});

describe("session records", () => {
  it("round-trips a session through its saved record", () => {
    const session = withBonus(BONUS_PER_HINT);
    const hinted = spendHint(session)!;
    const restored = restoreSession(level, JSON.parse(JSON.stringify(toRecord(hinted))));
    expect([...restored.bonus]).toEqual([...hinted.bonus]);
    expect([...restored.hintCells]).toEqual([...hinted.hintCells]);
    expect(restored.hintsUsed).toBe(1);
  });

  it("drops saved words and cells that are not in this level", () => {
    const restored = restoreSession(level, {
      found: ["zzzz", level.placements[0]!.word],
      bonus: [],
      hintCells: ["99,99"],
      hintsUsed: 0,
    });
    expect([...restored.found]).toEqual([level.placements[0]!.word]);
    expect(restored.hintCells.size).toBe(0);
  });
});

describe("saves", () => {
  const storage = () => {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      raw: data,
    };
  };

  it("loads empty when nothing is saved or the save is unreadable", () => {
    expect(loadSaves(storage())).toEqual({ levels: {}, daily: {} });
    const bad = storage();
    bad.setItem(SAVES_KEY, "{not json");
    expect(loadSaves(bad)).toEqual({ levels: {}, daily: {} });
  });

  it("keeps good entries and drops malformed ones", () => {
    const s = storage();
    s.setItem(
      SAVES_KEY,
      JSON.stringify({
        levels: { good: { found: ["cat"], bonus: [], hintCells: [], hintsUsed: 0 }, bad: { found: "x" } },
        daily: { today: { startedAt: 5 }, broken: { startedAt: "soon" } },
      }),
    );
    const loaded = loadSaves(s);
    expect(Object.keys(loaded.levels)).toEqual(["good"]);
    expect(Object.keys(loaded.daily)).toEqual(["today"]);
  });

  it("round-trips what it saves", () => {
    const s = storage();
    const saves = { levels: { a: { found: ["cat"], bonus: [], hintCells: [], hintsUsed: 2 } }, daily: {} };
    saveSaves(saves, s);
    expect(loadSaves(s)).toEqual(saves);
  });
});

describe("dailyScore", () => {
  it("scores faster times higher, and never below zero", () => {
    expect(dailyScore(60_000)).toBeGreaterThan(dailyScore(120_000));
    expect(dailyScore(1_000_000_000)).toBe(0);
  });
});
