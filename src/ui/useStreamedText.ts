import { useEffect, useState } from 'react';

/**
 * Reveal a string word-by-word at `msPerWord` cadence, returning the
 * progressively-grown substring + a `done` flag. When `enabled` is false,
 * returns the full content immediately so old chat bubbles render in one
 * shot. Studio enables streaming only on the most recent assistant turn,
 * which gives the demo a typing-in-real-time vibe without changing model
 * latency.
 */
export function useStreamedText(
  content: string,
  enabled: boolean,
  msPerWord = 32,
): { revealed: string; done: boolean } {
  const [revealed, setRevealed] = useState(enabled ? '' : content);
  const [done, setDone] = useState(!enabled);

  useEffect(() => {
    if (!enabled || !content) {
      setRevealed(content);
      setDone(true);
      return;
    }
    setRevealed('');
    setDone(false);
    // Splitting on `(\s+)` keeps the whitespace tokens in the array so we
    // can re-join slices losslessly — no double-spaces, no lost newlines.
    const tokens = content.split(/(\s+)/);
    let i = 0;
    let cancelled = false;
    let timer = 0;
    function tick() {
      if (cancelled) return;
      i++;
      setRevealed(tokens.slice(0, i).join(''));
      if (i < tokens.length) {
        timer = window.setTimeout(tick, msPerWord);
      } else {
        setDone(true);
      }
    }
    timer = window.setTimeout(tick, msPerWord);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [content, enabled, msPerWord]);

  return { revealed, done };
}
