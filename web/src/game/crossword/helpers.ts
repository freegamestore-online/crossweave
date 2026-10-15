import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildWordlist } from "../../words/wordlist";
import type { Placement } from "./generator";

/** The shipped common-words list, as the game loads it. Tests run from web/. */
export function loadCommon(): Set<string> {
  return buildWordlist(readFileSync(join(process.cwd(), "public/wordlists/common.txt"), "utf8"));
}

/**
 * Every run of two or more letters in the grid, read from the cells alone. A valid grid has
 * exactly the placed words as its runs: any extra run means two words touch unintentionally.
 */
export function runsOf(placements: readonly Placement[]): string[] {
  const letters = new Map<string, string>();
  for (const p of placements) {
    for (let k = 0; k < p.word.length; k++) {
      const row = p.row + (p.dir === "down" ? k : 0);
      const col = p.col + (p.dir === "across" ? k : 0);
      letters.set(`${row},${col}`, p.word[k]!);
    }
  }
  const runs: string[] = [];
  for (const [key, letter] of letters) {
    const [row, col] = key.split(",").map(Number) as [number, number];
    for (const [dr, dc, dir] of [[0, 1, "across"], [1, 0, "down"]] as const) {
      if (letters.has(`${row - dr},${col - dc}`)) continue; // only read runs from their start
      let word = letter;
      for (let r = row + dr, c = col + dc; letters.has(`${r},${c}`); r += dr, c += dc) {
        word += letters.get(`${r},${c}`);
      }
      if (word.length >= 2) runs.push(`${dir}:${row},${col}:${word}`);
    }
  }
  return runs.sort();
}

/** The same runs, derived from the placements' words. */
export function expectedRuns(placements: readonly Placement[]): string[] {
  return placements.map((p) => `${p.dir}:${p.row},${p.col}:${p.word}`).sort();
}

/** True when every placed word shares a cell with another, through a chain of crossings. */
export function isConnected(placements: readonly Placement[]): boolean {
  const cellsOf = (p: Placement) =>
    [...p.word].map((_, k) => `${p.row + (p.dir === "down" ? k : 0)},${p.col + (p.dir === "across" ? k : 0)}`);
  const seen = new Set<number>([0]);
  const queue = [0];
  while (queue.length > 0) {
    const current = new Set(cellsOf(placements[queue.pop()!]!));
    placements.forEach((other, i) => {
      if (seen.has(i)) return;
      if (cellsOf(other).some((cell) => current.has(cell))) {
        seen.add(i);
        queue.push(i);
      }
    });
  }
  return seen.size === placements.length;
}
