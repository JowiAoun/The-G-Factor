import { useEffect, useState } from 'react';
import { subscribeAmplitude } from '../strudel/engine';

/**
 * Returns the raw peak-amplitude (0..1) of Strudel's master output, sampled
 * once per rAF tick. Stays at 0 while `active` is false so subscribers can
 * cheaply opt-out (no rAF, no allocations).
 *
 * Use this for *intensity* effects (performer aura brightness, marquee
 * bulb glow, particle emit rate). For mouth lip-sync (a binary frame
 * counter at a threshold) prefer `useAudioMouth` instead - that hook
 * already debounces the value to a 0|1 state, which avoids re-rendering
 * a Performer's avatar SVG on every frame.
 */
export function useAudioAmplitude(active: boolean): number {
  const [amp, setAmp] = useState(0);
  useEffect(() => {
    if (!active) {
      setAmp(0);
      return;
    }
    return subscribeAmplitude((a) => setAmp(a));
  }, [active]);
  return amp;
}
