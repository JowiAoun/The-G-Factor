import { useEffect, useRef, useState } from 'react';
import {
  NORMAL_JOKES,
  PATIENCE_JOKES,
  REVEAL_JOKES,
  PATIENCE_THRESHOLD_MS,
  PATIENCE_MIN_CONTESTANTS,
  durationForJoke,
  pickFromPool,
} from '../talent/jokes';

type Args = {
  /** performance.now() of when casting started; the patience-mode
   *  predicate compares against this. */
  startedAt: number;
  /** Number of valid contestants that have streamed in. */
  contestantsReady: number;
  /** True once the bracket is built and we're animating the
   *  curtain-open reveal; freezes the host on her final line. */
  revealing: boolean;
};

/**
 * Rotates the host's lines on a length-aware timer while the bracket is
 * casting. After `PATIENCE_THRESHOLD_MS` elapsed with fewer than
 * `PATIENCE_MIN_CONTESTANTS` valid contestants ready, swaps the
 * source pool from NORMAL to PATIENCE. When `revealing` flips to
 * true, locks in a one-shot REVEAL line and stops rotating.
 *
 * Implementation note: the effect deps are deliberately just
 * `[current, revealing]`. The patience predicate reads the latest
 * `contestantsReady` and `startedAt` through refs so a contestant
 * arriving mid-joke doesn't cancel the in-progress display timer -
 * the joke gets to finish its scheduled duration before the next
 * pick reads fresh state.
 */
export function useAnnouncerJoke({
  startedAt,
  contestantsReady,
  revealing,
}: Args): string {
  const usedRef = useRef<Set<string>>(new Set());
  const revealLineRef = useRef<string | null>(null);
  const contestantsReadyRef = useRef(contestantsReady);
  const startedAtRef = useRef(startedAt);
  contestantsReadyRef.current = contestantsReady;
  startedAtRef.current = startedAt;

  const [current, setCurrent] = useState<string>(() =>
    pickFromPool(NORMAL_JOKES, usedRef.current),
  );

  useEffect(() => {
    if (revealing) {
      if (!revealLineRef.current) {
        revealLineRef.current = pickFromPool(REVEAL_JOKES, new Set());
        setCurrent(revealLineRef.current);
      }
      return;
    }
    const id = window.setTimeout(() => {
      const elapsed = performance.now() - startedAtRef.current;
      const inPatience =
        elapsed > PATIENCE_THRESHOLD_MS &&
        contestantsReadyRef.current < PATIENCE_MIN_CONTESTANTS;
      const pool = inPatience ? PATIENCE_JOKES : NORMAL_JOKES;
      const next = pickFromPool(pool, usedRef.current);
      setCurrent(next);
    }, durationForJoke(current));
    return () => window.clearTimeout(id);
  }, [current, revealing]);

  return current;
}
