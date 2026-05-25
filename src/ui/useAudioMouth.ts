import { useEffect, useState } from 'react';
import { subscribeAmplitude } from '../strudel/engine';

/**
 * Drives a 0/1 frame counter off the *real* audio amplitude flowing
 * through Strudel's destination. Frame is 1 when peak-amplitude crosses
 * the threshold (a kick, a snare, a vocal transient) and 0 otherwise, so
 * mapping it to mouth poses gives a genuine lip-sync feel rather than a
 * fixed time-cycle.
 *
 * Stays at 0 when `active` is false - every component that uses this
 * pattern (persona, contestants) only wants audio reactivity while their
 * audio is actually playing.
 */
export function useAudioMouth(active: boolean, threshold = 0.18): 0 | 1 {
  const [frame, setFrame] = useState<0 | 1>(0);
  useEffect(() => {
    if (!active) {
      setFrame(0);
      return;
    }
    const unsub = subscribeAmplitude((amp) => {
      const next: 0 | 1 = amp > threshold ? 1 : 0;
      setFrame((prev) => (prev === next ? prev : next));
    });
    return unsub;
  }, [active, threshold]);
  return frame;
}
