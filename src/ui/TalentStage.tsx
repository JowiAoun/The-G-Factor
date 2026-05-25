import {
  lazy,
  Suspense,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Audience } from './Audience';
import { useAudioAmplitude } from './useAudioAmplitude';
import { useReducedMotion } from './useReducedMotion';

// Lazy-load so the audiomotion-analyzer payload (~30 kB) and
// tsparticles payload (~50 kB) are fetched only when a performance
// actually starts.
const StageVisualizer = lazy(() => import('./StageVisualizer'));
const StageSparkles = lazy(() => import('./StageSparkles'));

export type StagePhase = 'casting' | 'showing' | 'champion';
export type CurtainState = 'open' | 'closed';

type TalentStageProps = {
  phase: StagePhase;
  curtain: CurtainState;
  /** Title rendered in the lit-bulb marquee at the top of the stage. */
  marquee: string;
  /** When true, footlights pulse faster and the spotlight brightens -
   *  used while a contestant's audio is playing. */
  spotlightActive?: boolean;
  /** On-stage content: host (casting), two Performers + VS (showing), one Performer (champion). */
  children: ReactNode;
};

/**
 * Generic theatrical shell shared by every Talent Show phase. The parent
 * drives the `curtain` state machine across phase transitions; this
 * component is otherwise dumb - it only describes the proscenium, the
 * curtains, the lighting, and the floor.
 */
export function TalentStage({
  phase,
  curtain,
  marquee,
  spotlightActive,
  children,
}: TalentStageProps) {
  const classes = ['talent-stage', `phase-${phase}`];
  if (curtain === 'open') classes.push('curtain-open');

  // The expensive reactive layers (canvas visualizer, particle emitter,
  // amplitude-driven marquee glow) are gated behind reduced-motion as
  // well as `spotlightActive`. CSS-driven animations inside the stage
  // are already disabled via the @media (prefers-reduced-motion) block,
  // but rAF-driven canvases ignore CSS - they have to be unmounted.
  const reducedMotion = useReducedMotion();
  const reactive = !!spotlightActive && !reducedMotion;

  // One shared amplitude subscription per stage. Drives the marquee
  // bulb glow when a performance is on; idle otherwise (no rAF cost).
  const amp = useAudioAmplitude(reactive);
  const marqueeStyle = reactive
    ? ({ '--bulb-glow': amp.toFixed(2) } as Record<string, string> as CSSProperties)
    : undefined;

  return (
    <div
      className={classes.join(' ')}
      role="region"
      aria-label={`Talent stage - ${phase}`}
    >
      <div className="stage-backdrop" aria-hidden="true" />
      <div
        className={`stage-spotlight${spotlightActive ? ' is-active' : ''}`}
        aria-hidden="true"
      />
      <div className="stage-floor" aria-hidden="true" />

      <div className="stage-marquee-wrap" aria-hidden="true">
        <div
          className={`stage-marquee${reactive ? ' is-reactive' : ''}`}
          style={marqueeStyle}
        >
          <span className="stage-marquee-bulb" />
          <span>{marquee}</span>
          <span className="stage-marquee-bulb" />
        </div>
      </div>

      {children}

      <div
        className={`stage-footlights${spotlightActive ? ' is-active' : ''}`}
        aria-hidden="true"
      >
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="stage-footlight" />
        ))}
      </div>

      <Audience cheering={!!spotlightActive} />

      {reactive && (
        <Suspense fallback={null}>
          <StageVisualizer active />
          <StageSparkles active />
        </Suspense>
      )}

      <div className="stage-curtain left" aria-hidden="true" />
      <div className="stage-curtain right" aria-hidden="true" />
    </div>
  );
}
