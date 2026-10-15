import { describe, expect, it } from "vitest";
import { isFormable } from "./solver";
import { createRng, shuffle } from "./rng";
import { generateGrid } from "./generator";
import { PACKS, LEVELS_PER_PACK, makeLevel, packLevel } from "./levels";
import { expectedRuns, isConnected, loadCommon, runsOf } from "./helpers";

const dictionary = loadCommon();

describe("generateGrid", () => {
  it("returns null when the letters spell no word", () => {
    expect(generateGrid("qzxv", dictionary, createRng("x"), { minWords: 1, maxWords: 3, minLength: 3 })).toBeNull();
  });

  it("builds a valid grid from a wheel of letters", () => {
    const placements = generateGrid("tealor", dictionary, createRng("tealor"), {
      minWords: 3,
      maxWords: 6,
      minLength: 3,
    });
    expect(placements).not.toBeNull();
    expect(placements!.length).toBeGreaterThanOrEqual(3);
    expect(runsOf(placements!)).toEqual(expectedRuns(placements!));
  });
});

describe("generated levels", () => {
  // A spread of seeds across every pack, so the checks cover short and long wheels.
  const sample = PACKS.flatMap((_, pack) =>
    [1, 7, 13, 25].map((n) => packLevel(pack, n - 1, dictionary)),
  );

  it("uses only common words that are formable from the wheel letters", () => {
    for (const level of sample) {
      for (const p of level.placements) {
        expect(dictionary.has(p.word), `${level.id}: ${p.word} is not common`).toBe(true);
        expect(isFormable(p.word, level.letters), `${level.id}: ${p.word} not in ${level.letters}`).toBe(true);
      }
    }
  });

  it("never repeats a word within one grid", () => {
    for (const level of sample) {
      const words = level.placements.map((p) => p.word);
      expect(new Set(words).size, level.id).toBe(words.length);
    }
  });

  it("keeps the grid connected", () => {
    for (const level of sample) {
      expect(isConnected(level.placements), level.id).toBe(true);
    }
  });

  it("has no stray runs, so every letter run is a placed word", () => {
    for (const level of sample) {
      expect(runsOf(level.placements), level.id).toEqual(expectedRuns(level.placements));
    }
  });

  it("keeps each grid within its pack's word count", () => {
    PACKS.forEach((pack, i) => {
      for (const n of [1, 13, 25]) {
        const level = packLevel(i, n - 1, dictionary);
        expect(level.placements.length).toBeGreaterThanOrEqual(pack.spec.minWords);
        expect(level.placements.length).toBeLessThanOrEqual(pack.spec.maxWords);
        expect(level.letters.length).toBe(pack.spec.wheel);
      }
    });
  });

  it("builds every level in every pack", () => {
    expect(PACKS.length * LEVELS_PER_PACK).toBe(200);
    for (let pack = 0; pack < PACKS.length; pack++) {
      for (let i = 0; i < LEVELS_PER_PACK; i++) {
        const level = packLevel(pack, i, dictionary);
        expect(isConnected(level.placements), level.id).toBe(true);
      }
    }
  }, 60_000);

  it("gives the same level for the same seed", () => {
    const a = makeLevel("Leaf:3", dictionary, PACKS[3]!.spec);
    const b = makeLevel("Leaf:3", dictionary, PACKS[3]!.spec);
    expect(b).toEqual(a);
  });

  it("gives a different level for a different seed", () => {
    const a = makeLevel("Leaf:3", dictionary, PACKS[3]!.spec);
    const b = makeLevel("Leaf:4", dictionary, PACKS[3]!.spec);
    expect(b).not.toEqual(a);
  });

  it("shuffles without losing letters", () => {
    const letters = [..."crossword"];
    expect(shuffle(letters, createRng("s")).sort()).toEqual([...letters].sort());
  });
});
