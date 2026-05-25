import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

type RouteCurtainProps = {
  /** Changes when the user has requested a different venue. */
  targetKey: string;
  /** Fired when the curtains are fully closed; parent swaps content here. */
  onHalfway: () => void;
};

type Phase = 'idle' | 'closing' | 'closed' | 'opening';

/**
 * Two velvet panels that sweep in from the sides, hold briefly, and
 * sweep out whenever `targetKey` changes. Mirrors the Talent Show's
 * curtain choreography but at the route level.
 *
 * Sequence: idle -> closing (700ms) -> closed (80ms hold) -> opening
 * (700ms) -> idle. `onHalfway` fires at the start of `closed`, which is
 * when the parent should swap the visible content.
 *
 * Honours prefers-reduced-motion by skipping the animation entirely and
 * firing `onHalfway` on the next microtask so the parent still gets the
 * content-swap signal.
 */
export function RouteCurtain({ targetKey, onHalfway }: RouteCurtainProps) {
  const reducedMotion = useReducedMotion();
  const lastKeyRef = useRef(targetKey);
  const [phase, setPhase] = useState<Phase>('idle');
  const holdTimerRef = useRef<number | null>(null);
  const onHalfwayRef = useRef(onHalfway);
  onHalfwayRef.current = onHalfway;

  useEffect(() => {
    if (targetKey === lastKeyRef.current) return;
    lastKeyRef.current = targetKey;

    if (reducedMotion) {
      // Skip the animation entirely; still notify the parent so the
      // content swap happens.
      queueMicrotask(() => onHalfwayRef.current());
      return;
    }

    setPhase('closing');
  }, [targetKey, reducedMotion]);

  useEffect(() => () => {
    if (holdTimerRef.current != null) window.clearTimeout(holdTimerRef.current);
  }, []);

  function handleTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.propertyName !== 'transform') return;
    if (phase === 'closing') {
      // Curtains met in the middle. Tell the parent to swap content,
      // then hold for a beat before sweeping back open.
      setPhase('closed');
      onHalfwayRef.current();
      holdTimerRef.current = window.setTimeout(() => {
        setPhase('opening');
      }, 80);
    } else if (phase === 'opening') {
      setPhase('idle');
    }
  }

  if (reducedMotion) return null;

  const closed = phase === 'closing' || phase === 'closed';
  return (
    <div
      className={`route-curtain-layer${phase !== 'idle' ? ' is-active' : ''}`}
      aria-hidden="true"
    >
      <div
        className={`route-curtain left${closed ? ' is-closed' : ''}`}
        onTransitionEnd={handleTransitionEnd}
      />
      <div
        className={`route-curtain right${closed ? ' is-closed' : ''}`}
        onTransitionEnd={handleTransitionEnd}
      />
    </div>
  );
}
