import { useMemo, useRef, useState, type PointerEvent, type RefObject } from "react";
import { hitTest, trailWord, wheelPositions, type Point } from "../game/wheel";

/** How close a pointer must be to a letter to pick it, as a percentage of the wheel. */
const HIT_RADIUS = 13;

interface LetterWheelProps {
  letters: string;
  /** The wheel's box, so the board can shake it and fly words out of it. */
  wheelRef: RefObject<HTMLDivElement | null>;
  /** Called on release with the word the swipe spelled. Taps of one letter are not sent. */
  onSwipe: (word: string) => void;
  onShuffle: () => void;
  hintLabel: string;
  hintDisabled: boolean;
  onHint: () => void;
}

/**
 * The letter wheel. A swipe that starts on a letter and passes over others spells a word.
 * Letters are picked once each, and the trail is drawn as the pointer moves.
 */
export function LetterWheel({ letters, wheelRef, onSwipe, onShuffle, hintLabel, hintDisabled, onHint }: LetterWheelProps) {
  const positions = useMemo(() => wheelPositions(letters.length), [letters.length]);
  const [trail, setTrail] = useState<number[]>([]);
  const [pointer, setPointer] = useState<Point | null>(null);
  // The trail is read inside pointer handlers, which can run before React re-renders.
  const trailRef = useRef<number[]>([]);

  const update = (next: number[]) => {
    trailRef.current = next;
    setTrail(next);
  };

  const pointAt = (event: PointerEvent<HTMLDivElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    };
  };

  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    const point = pointAt(event);
    const index = hitTest(point, positions, HIT_RADIUS);
    if (index === null) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    update([index]);
    setPointer(point);
  };

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (trailRef.current.length === 0) return;
    const point = pointAt(event);
    setPointer(point);
    const index = hitTest(point, positions, HIT_RADIUS);
    if (index !== null && !trailRef.current.includes(index)) update([...trailRef.current, index]);
  };

  const onEnd = () => {
    const picked = trailRef.current;
    update([]);
    setPointer(null);
    if (picked.length >= 2) onSwipe(trailWord(picked, letters));
  };

  const points = [...trail.map((i) => positions[i]!), ...(pointer && trail.length ? [pointer] : [])];

  return (
    <div className="wheel-area">
      <div
        ref={wheelRef}
        className="wheel"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onEnd}
        onPointerCancel={onEnd}
        aria-label={`Letter wheel: ${letters}`}
      >
        <svg className="trail" viewBox="0 0 100 100" aria-hidden="true">
          {points.length > 1 && <polyline points={points.map((p) => `${p.x},${p.y}`).join(" ")} />}
        </svg>
        {positions.map((p, i) => (
          <span
            key={i}
            className={trail.includes(i) ? "wheel-letter in-trail" : "wheel-letter"}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {letters[i]}
          </span>
        ))}
      </div>
      <div className="wheel-buttons">
        <button type="button" className="shuffle-btn" onClick={onShuffle}>
          Shuffle
        </button>
        <button type="button" className="shuffle-btn" onClick={onHint} disabled={hintDisabled}>
          {hintLabel}
        </button>
      </div>
    </div>
  );
}
