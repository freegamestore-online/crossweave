import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Board } from "./Board";
import { LetterWheel } from "./LetterWheel";
import { packLevel } from "../game/crossword/levels";
import { loadCommon } from "../game/crossword/helpers";
import { newSession, type Session } from "../game/session";
import { wheelPositions } from "../game/wheel";
import { solve } from "../game/crossword/solver";

// jsdom has no PointerEvent. Testing Library falls back to the global, so MouseEvent carries clientX/Y.
beforeAll(() => {
  if (!("PointerEvent" in globalThis)) Object.assign(globalThis, { PointerEvent: MouseEvent });
});

// Every element reports a 100 x 100 box at the origin, so percentages equal pixels.
beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => {},
  } as DOMRect);
  window.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0) as unknown as number;
});
afterEach(() => vi.restoreAllMocks());

const dictionary = loadCommon();
const level = packLevel(0, 0, dictionary);

/** The indices in the wheel that spell the word, one letter each. */
function indicesFor(word: string, letters: string): number[] {
  const used = new Set<number>();
  return [...word].map((ch) => {
    const i = [...letters].findIndex((c, j) => c === ch && !used.has(j));
    used.add(i);
    return i;
  });
}

/** Swipes through the wheel's letters in order, as a finger would. */
function swipe(wheel: HTMLElement, indices: number[]) {
  const points = wheelPositions(level.letters.length);
  const at = (i: number) => ({ clientX: points[i]!.x, clientY: points[i]!.y });
  fireEvent.pointerDown(wheel, at(indices[0]!));
  for (const i of indices.slice(1)) fireEvent.pointerMove(wheel, at(i));
  fireEvent.pointerUp(wheel, at(indices[indices.length - 1]!));
}

function Harness({ onSession }: { onSession?: (s: Session) => void }) {
  const [session, setSession] = useState(() => newSession(level));
  return (
    <Board
      level={level}
      session={session}
      validWords={dictionary}
      onSession={(next) => {
        onSession?.(next);
        setSession(next);
      }}
      onNext={null}
    />
  );
}

describe("LetterWheel", () => {
  it("sends the spelled word on release", () => {
    const onSwipe = vi.fn();
    const ref = { current: null };
    render(<LetterWheel letters="cats" wheelRef={ref} onSwipe={onSwipe} onShuffle={() => {}} />);
    swipe(screen.getByLabelText("Letter wheel: cats"), [0, 1, 2]);
    expect(onSwipe).toHaveBeenCalledWith("cat");
  });

  it("picks each letter once, and does not send a single tap", () => {
    const onSwipe = vi.fn();
    const ref = { current: null };
    render(<LetterWheel letters="cats" wheelRef={ref} onSwipe={onSwipe} onShuffle={() => {}} />);
    const wheel = screen.getByLabelText("Letter wheel: cats");
    swipe(wheel, [0, 1, 0, 2]);
    expect(onSwipe).toHaveBeenLastCalledWith("cat");
    swipe(wheel, [3]);
    expect(onSwipe).toHaveBeenCalledTimes(1);
  });

  it("shuffles when asked", () => {
    const onShuffle = vi.fn();
    const ref = { current: null };
    render(<LetterWheel letters="cats" wheelRef={ref} onSwipe={() => {}} onShuffle={onShuffle} />);
    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));
    expect(onShuffle).toHaveBeenCalled();
  });
});

describe("Board", () => {
  it("reveals a grid word when it is swiped", () => {
    const { container } = render(<Harness />);
    const word = level.placements[0]!.word;
    swipe(screen.getByLabelText(/Letter wheel/), indicesFor(word, level.letters));
    const grid = screen.getByRole("img", { name: /Crossword/ });
    expect(grid.getAttribute("aria-label")).toBe(`Crossword, 1 of ${level.placements.length} words found`);
    const revealed = container.querySelectorAll(".cell.reveal");
    expect(revealed.length).toBeGreaterThanOrEqual(word.length);
  });

  it("adds a valid word that is not in the grid to the bonus jar", () => {
    const { container } = render(<Harness />);
    const inGrid = new Set(level.placements.map((p) => p.word));
    const bonus = solve(level.letters, dictionary).find((w) => !inGrid.has(w));
    expect(bonus).toBeDefined();
    swipe(screen.getByLabelText(/Letter wheel/), indicesFor(bonus!, level.letters));
    expect(container.querySelector(".jar")?.textContent).toContain(bonus!);
  });

  it("leaves the grid and jar unchanged for a miss", () => {
    const { container } = render(<Harness />);
    // Two letters is too short to be a word, so the swipe is a miss.
    swipe(screen.getByLabelText(/Letter wheel/), [0, 1]);
    expect(container.querySelectorAll(".cell.reveal")).toHaveLength(0);
    expect(container.querySelector(".jar")?.textContent).toBe("Bonus: 0");
  });

  it("keeps the same letters when shuffled", () => {
    render(<Harness />);
    const wheel = screen.getByLabelText(/Letter wheel/);
    const before = wheel.getAttribute("aria-label")!.split(": ")[1]!;
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));
    });
    const after = screen.getByLabelText(/Letter wheel/).getAttribute("aria-label")!.split(": ")[1]!;
    expect([...after].sort()).toEqual([...before].sort());
  });
});
