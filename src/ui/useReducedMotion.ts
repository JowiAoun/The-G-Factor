import { useEffect, useState } from 'react';

/**
 * Live `prefers-reduced-motion` flag. Re-evaluates when the user toggles
 * the system setting mid-session so motion gating is honest even during a
 * long-running session. Returns `false` outside the browser (SSR safety).
 *
 * Shared by TalentStage (skips visualizer + sparkles) and RouteCurtain
 * (skips the wipe transition between venues).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}
