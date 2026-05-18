import { useEffect, useState } from 'react';

/**
 * Drives a 0/1 frame counter that toggles on a fixed interval while
 * `active` is true. Used to swap between two mouth poses (smile ↔ agape) on
 * an avatar SVG so it looks like the character is talking. While `active`
 * is false the frame stays at 0 (closed-mouth idle state).
 *
 * `intervalMs` defaults to 150 (matches the contestant talk cadence); the
 * Studio's persona uses ~200 ms to read as "thinking" rather than "playing
 * audio."
 */
export function useTalkCycle(active: boolean, intervalMs = 150): 0 | 1 {
  const [frame, setFrame] = useState<0 | 1>(0);
  useEffect(() => {
    if (!active) {
      setFrame(0);
      return;
    }
    const id = window.setInterval(() => {
      setFrame((f) => (f === 0 ? 1 : 0));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);
  return frame;
}
