import { describe, expect, it } from "vitest";
import { hitTest, shuffleLetters, trailWord, wheelPositions } from "./wheel";
import { isSolved, newSession, playWord } from "./session";
import { loadProgress, nextProgress, saveProgress, PROGRESS_KEY } from "./progress";
import { LEVELS_PER_PACK, PACKS, packLevel } from "./crossword/levels";
import { createRng } from "./crossword/rng";
import { loadCommon } from "./crossword/helpers";
import { layoutGrid, startCell } from "./grid";

describe("wheel geometry", () => {
  it("puts letters evenly around the centre, starting at the top", () => {
    const [top, right] = wheelPositions(4);
    expect(top!.x).toBeCloseTo(50);
    expect(top!.y).toBeCloseTo(10);
    expect(right!.x).toBeCloseTo(90);
    expect(right!.y).toBeCloseTo(50);
  });

  it("finds the nearest letter inside the hit radius, and nothing outside it", () => {
    const positions = wheelPositions(4);
    expect(hitTest({ x: 51, y: 11 }, positions, 8)).toBe(0);
    expect(hitTest({ x: 50, y: 50 }, positions, 8)).toBeNull();
  });
});

describe("trailWord", () => {
  it("spells the letters in trail order", () => {
    expect(trailWord([2, 0, 1], "cat")).toBe("tca");
  });
});

describe("shuffleLetters", () => {
  it("keeps the same letters in a new order", () => {
    const shuffled = shuffleLetters("crossword", createRng("wheel"));
    expect([...shuffled].sort()).toEqual([..."crossword"].sort());
  });
});

describe("playWord", () => {
  const dictionary = loadCommon();
  const level = packLevel(0, 0, dictionary);
  const [first] = level.placements;
  const validWords = new Set([first!.word, "ate"]);

  it("reveals a grid word once", () => {
    const first1 = playWord(newSession(level), first!.word, validWords);
    expect(first1.result).toBe("slot");
    expect(first1.session.found.has(first!.word)).toBe(true);
    expect(playWord(first1.session, first!.word, validWords).result).toBe("repeat");
  });

  it("sends a valid word outside the grid to the bonus jar", () => {
    const outside = playWord(newSession(level), "ate", validWords);
    expect(outside.result).toBe("bonus");
    expect(playWord(outside.session, "ate", validWords).result).toBe("repeat");
  });

  it("rejects short and unknown words without changing the session", () => {
    const session = newSession(level);
    expect(playWord(session, "at", validWords)).toEqual({ session, result: "unknown" });
    expect(playWord(session, "zzzz", validWords)).toEqual({ session, result: "unknown" });
  });

  it("is solved once every grid word is found", () => {
    let session = newSession(level);
    for (const p of level.placements) session = playWord(session, p.word, validWords).session;
    expect(isSolved(session)).toBe(true);
    expect(isSolved(newSession(level))).toBe(false);
  });
});

describe("progress", () => {
  const storage = (value: string | null) => ({
    getItem: () => value,
    setItem: () => undefined,
  });

  it("starts at the first level with nothing saved", () => {
    expect(loadProgress(storage(null))).toEqual({ pack: 0, level: 0 });
  });

  it("ignores unreadable or out-of-range saves", () => {
    expect(loadProgress(storage("not json"))).toEqual({ pack: 0, level: 0 });
    expect(loadProgress(storage(JSON.stringify({ pack: 99, level: 0 })))).toEqual({ pack: 0, level: 0 });
  });

  it("round-trips a save", () => {
    const written = new Map<string, string>();
    const store = { setItem: (k: string, v: string) => written.set(k, v), getItem: (k: string) => written.get(k) ?? null };
    saveProgress({ pack: 2, level: 7 }, store);
    expect(written.get(PROGRESS_KEY)).toBe('{"pack":2,"level":7}');
    expect(loadProgress(store)).toEqual({ pack: 2, level: 7 });
  });

  it("moves on through levels, then packs, and stops after the last", () => {
    expect(nextProgress({ pack: 0, level: 0 })).toEqual({ pack: 0, level: 1 });
    expect(nextProgress({ pack: 0, level: LEVELS_PER_PACK - 1 })).toEqual({ pack: 1, level: 0 });
    const last = { pack: PACKS.length - 1, level: LEVELS_PER_PACK - 1 };
    expect(nextProgress(last)).toBeNull();
  });
});

describe("layoutGrid", () => {
  it("puts the grid's top-left at 0, 0 and marks each cell's words", () => {
    const layout = layoutGrid([
      { word: "cat", row: -1, col: 2, dir: "down" },
      { word: "tab", row: 1, col: 2, dir: "across" },
    ]);
    expect(layout.rows).toBe(3);
    expect(layout.cols).toBe(3);
    expect(layout.cells.get("1,0")?.words).toEqual(["cat"]);
    expect(layout.cells.get("2,0")?.letter).toBe("t");
    expect(layout.cells.get("2,0")?.words).toEqual(["cat", "tab"]);
    expect(startCell({ word: "tab", row: 1, col: 2, dir: "across" }, layout)).toBe("2,0");
  });
});
