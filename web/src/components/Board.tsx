import { useRef, useState, type ReactNode } from "react";
import { useGameSounds } from "@freegamestore/games";
import { CrosswordGrid } from "./CrosswordGrid";
import { LetterWheel } from "./LetterWheel";
import { Celebration } from "../feel/Celebration";
import { ParticleLayer, type ParticleLayerHandle } from "../feel";
import { HAPTICS, vibrate } from "../feel/haptics";
import { flyWord } from "../feel/flyWord";
import { useShake } from "../feel/useShake";
import { prefersReducedMotion } from "../motion/reducedMotion";
import type { Level } from "../game/crossword/levels";
import { layoutGrid, startCell } from "../game/grid";
import { isSolved, playWord, spendHint, hintsAvailable, type Session } from "../game/session";
import { shuffleLetters } from "../game/wheel";

const BURST_COLOURS = ["#2563eb", "#16a34a", "#d97706"];
const ignore = () => {};

interface BoardProps {
  level: Level;
  session: Session;
  validWords: ReadonlySet<string>;
  onSession: (next: Session) => void;
  /** Moves to the next level. Null when the player has reached the last one. */
  onNext: (() => void) | null;
  /** Shown in the level-complete panel, for example a daily time and the leaderboard. */
  footer?: ReactNode;
}

/**
 * One level on screen: the grid, the wheel, and the bonus jar. Each played word gets feedback:
 * a found word flies into the grid, a bonus word flies into the jar, and a miss shakes the wheel.
 * The wheel order is local, and shuffling changes only the order.
 */
export function Board({ level, session, validWords, onSession, onNext, footer }: BoardProps) {
  const [wheel, setWheel] = useState(level.letters);
  const { playScore, playError, playMove } = useGameSounds();
  const boardRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const jarRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<ParticleLayerHandle>(null);
  const shake = useShake(wheelRef, { amplitude: 6, duration: 320 });
  const layout = layoutGrid(level.placements);
  const solved = isSolved(session);
  const hints = hintsAvailable(session);

  const onHint = () => {
    const next = spendHint(session);
    if (next) onSession(next);
  };

  const burstAt = (element: Element) => {
    const board = boardRef.current?.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    if (!board) return;
    layerRef.current?.burst(box.left + box.width / 2 - board.left, box.top + box.height / 2 - board.top, BURST_COLOURS, {
      count: 18,
      speed: [120, 260],
      size: [3, 6],
      life: 0.6,
    });
  };

  const onSwipe = (word: string) => {
    const { session: next, result } = playWord(session, word, validWords);
    onSession(next);
    const motion = !prefersReducedMotion();

    if (result === "slot") {
      const placement = level.placements.find((p) => p.word === word);
      const target = placement && gridRef.current?.querySelector(`[data-cell="${startCell(placement, layout)}"]`);
      if (target) {
        if (motion && wheelRef.current) flyWord(word, wheelRef.current, target);
        burstAt(target);
      }
      playScore();
      vibrate(HAPTICS.clear);
    } else if (result === "bonus") {
      if (motion && wheelRef.current && jarRef.current) flyWord(word, wheelRef.current, jarRef.current);
      playMove();
      vibrate(HAPTICS.clear);
    } else if (result === "repeat" || result === "unknown") {
      shake();
      playError();
      vibrate(40);
    }
  };

  return (
    <div ref={boardRef} className="board">
      <CrosswordGrid ref={gridRef} level={level} found={session.found} hintCells={session.hintCells} />
      <div ref={jarRef} className="jar" aria-live="polite">
        Bonus: {session.bonus.size}
        {session.bonus.size > 0 && <span className="jar-words"> {[...session.bonus].sort().join(" · ")}</span>}
      </div>
      <LetterWheel
        letters={wheel}
        wheelRef={wheelRef}
        onSwipe={onSwipe}
        onShuffle={() => setWheel((w) => shuffleLetters(w))}
        hintLabel={`Hint (${Math.max(0, hints)})`}
        hintDisabled={hints <= 0 || solved}
        onHint={onHint}
      />
      {solved && (
        <div className="level-done">
          <p>Level complete</p>
          {footer}
          {onNext ? (
            <button type="button" className="shuffle-btn" onClick={onNext}>
              Next level
            </button>
          ) : (
            <p>You have finished every level.</p>
          )}
        </div>
      )}
      {solved && <Celebration id={level.id} label="Level complete!" onDone={ignore} />}
      <ParticleLayer ref={layerRef} />
    </div>
  );
}
