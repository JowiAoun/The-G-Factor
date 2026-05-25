import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

const BLINK_DURATION_MS = 140;
const MIN_GAP_MS = 3000;
const MAX_GAP_MS = 7000;

/**
 * Returns `true` for ~140 ms every 3-7 s, used to swap a DiceBear avatar's
 * `eyes` option from open to closed for a real toon-head blink rather than a
 * CSS scale trick. Gap length is re-randomised after every blink so the
 * rhythm doesn't read as mechanical.
 *
 * Returns `false` permanently when the user prefers reduced motion or when
 * `active` is false (caller can pause blinking during a modal, route change,
 * etc.).
 */
export function useBlinkCycle(active: boolean = true): boolean {
  const reduced = useReducedMotion();
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    if (!active || reduced) {
      setBlinking(false);
      return;
    }
    let openId: number | null = null;
    let closeId: number | null = null;
    const schedule = () => {
      const gap = MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS);
      closeId = window.setTimeout(() => {
        setBlinking(true);
        openId = window.setTimeout(() => {
          setBlinking(false);
          schedule();
        }, BLINK_DURATION_MS);
      }, gap);
    };
    schedule();
    return () => {
      if (closeId !== null) window.clearTimeout(closeId);
      if (openId !== null) window.clearTimeout(openId);
    };
  }, [active, reduced]);
  return blinking;
}
