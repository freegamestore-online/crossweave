import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  COMMON_URL,
  OFFENSIVE_WORDS,
  VALIDATION_URL,
  WORD_PATTERN,
  buildWordlist,
  isOffensive,
  loadWordlist,
  parseWordlist,
} from "./wordlist";

// Tests run from web/ (pnpm --filter runs them there), so the shipped lists resolve from there.
const shipped = (name: string) => readFileSync(join(process.cwd(), "public/wordlists", name), "utf8");

describe("parseWordlist", () => {
  it("reads one word per line and skips blanks and comments", () => {
    const words = parseWordlist("# header\n\ncat\n  dog  \n# note\nfish\n");
    expect([...words]).toEqual(["cat", "dog", "fish"]);
  });

  it("keeps case, so proper nouns stay distinct from common words", () => {
    expect(parseWordlist("Aaron\naaron\n").has("Aaron")).toBe(true);
  });
});

describe("buildWordlist", () => {
  it("keeps lowercase words of three or more letters", () => {
    const words = buildWordlist("ab\ncat\nCrossword\nmulti-word\nit's\nfish\n");
    expect([...words].sort()).toEqual(["cat", "fish"]);
  });

  it("drops offensive words", () => {
    const words = buildWordlist("fuck\ncrossword\nshitty\n");
    expect([...words]).toEqual(["crossword"]);
  });
});

describe("loadWordlist", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches a list and returns the playable words", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("# list\ncat\nfuck\nAaron\n")));
    const words = await loadWordlist("/wordlists/test.txt");
    expect([...words]).toEqual(["cat"]);
  });

  it("throws when the list cannot be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    await expect(loadWordlist("/wordlists/missing.txt")).rejects.toThrow("HTTP 404");
  });
});

describe("offensive-word filter", () => {
  it.each(["fuck", "shit", "bitch", "slut", "whore", "cunt", "nigger", "fucking", "whores"])(
    "flags %s",
    (word) => {
      expect(isOffensive(word)).toBe(true);
    },
  );

  it("matches regardless of case", () => {
    expect(isOffensive("FUCK")).toBe(true);
  });

  it("leaves words that only contain an offensive stem alone", () => {
    for (const word of ["dickens", "assassin", "scunthorpe", "crossword"]) {
      expect(isOffensive(word)).toBe(false);
    }
  });

  it("keeps the blocklist lowercase, so the lookup is one-to-one", () => {
    for (const word of OFFENSIVE_WORDS) expect(word).toBe(word.toLowerCase());
  });
});

describe("shipped wordlists", () => {
  const validation = buildWordlist(shipped("validation.txt"));
  const common = buildWordlist(shipped("common.txt"));

  it("loads the validation list in full", () => {
    expect(validation.size).toBeGreaterThan(50_000);
    expect(validation.has("crossword")).toBe(true);
    expect(validation.has("aaron")).toBe(false);
  });

  it("lists only playable words, with the offensive filter applied", () => {
    for (const word of [...validation, ...common]) {
      expect(WORD_PATTERN.test(word)).toBe(true);
      expect(isOffensive(word)).toBe(false);
    }
  });

  it("has a common-words subset that is a strict subset of the validation list", () => {
    expect(common.size).toBeGreaterThan(1_000);
    expect(common.size).toBeLessThan(validation.size);
    for (const word of common) expect(validation.has(word)).toBe(true);
  });

  it("ships the licence with the lists", () => {
    const licence = shipped("LICENSE");
    expect(licence).toContain("Kevin Atkinson");
    expect(licence).toContain("Permission to use, copy, modify, distribute, and sell");
  });

  it("points the loader at the shipped files", () => {
    expect(VALIDATION_URL).toBe("/wordlists/validation.txt");
    expect(COMMON_URL).toBe("/wordlists/common.txt");
  });
});
