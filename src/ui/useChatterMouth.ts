import { useEffect, useState } from 'react';

/**
 * Drives a 0/1 frame counter with a jittered cadence so the mouth
 * doesn't beat like a metronome.
 *
 * The host has no audio to drive `useAudioMouth`, but the rigid
 * fixed-interval `useTalkCycle` reads as a stiff lip-flap. Real speech
 * varies syllable-to-syllable, with occasional micro-pauses. This hook
 * samples each next interval uniformly from `[baseMs - jitterMs,
 * baseMs + jitterMs]`, and on roughly 1-in-`pauseEvery` toggles inserts
 * a longer hold so the mouth rests for a beat - the cumulative effect
 * feels closer to talking than ticking.
 */
export function useChatterMouth(
  active: boolean,
  baseMs = 130,
  jitterMs = 55,
  pauseEvery = 7,
  pauseMs = 320,
): 0 | 1 {
  const [frame, setFrame] = useState<0 | 1>(0);
  useEffect(() => {
    if (!active) {
      setFrame(0);
      return;
    }
    let cancelled = false;
    let tick = 0;
    let timer: number | null = null;
    const schedule = (): void => {
      const delay =
        tick > 0 && tick % pauseEvery === 0
          ? pauseMs
          : baseMs + (Math.random() * 2 - 1) * jitterMs;
      timer = window.setTimeout(() => {
        if (cancelled) return;
        tick += 1;
        setFrame((f) => (f === 0 ? 1 : 0));
        schedule();
      }, Math.max(50, delay));
    };
    schedule();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [active, baseMs, jitterMs, pauseEvery, pauseMs]);
  return frame;
}
