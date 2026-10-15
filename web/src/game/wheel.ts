import { shuffle } from "./crossword/rng";

/** A point as percentages of the wheel's box, so 50, 50 is the centre. */
export interface Point {
  x: number;
  y: number;
}

/** How far the letters sit from the centre, as a percentage of the box. */
const RADIUS = 40;

/** Letter centres around a circle, starting at the top and going clockwise. */
export function wheelPositions(count: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return { x: 50 + RADIUS * Math.cos(angle), y: 50 + RADIUS * Math.sin(angle) };
  });
}

/**
 * The letter under a point, as an index into `positions`, or null. A finger is bigger
 * than a letter, so the hit area is wider than the letter itself. The nearest letter wins.
 */
export function hitTest(point: Point, positions: readonly Point[], radius: number): number | null {
  let best: number | null = null;
  let bestDistance = radius;
  positions.forEach((p, i) => {
    const distance = Math.hypot(point.x - p.x, point.y - p.y);
    if (distance <= bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

/** The word a swipe spells: the letters at the trail's indices, in order. */
export function trailWord(indices: readonly number[], letters: string): string {
  return indices.map((i) => letters[i] ?? "").join("");
}

/** The wheel in a new random order. It is the same letters, so every word still forms. */
export function shuffleLetters(letters: string, rng: () => number = Math.random): string {
  return shuffle([...letters], rng).join("");
}
