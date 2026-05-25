import { useEffect, useMemo } from 'react';
import { preloadAvatar, renderAvatar, type MouthState } from '../talent/avatar';
import {
  GEMMA_AVATAR_OPTIONS,
  GEMMA_AVATAR_SEED,
  GEMMA_NAME,
} from '../talent/gemma';
import { useChatterMouth } from './useChatterMouth';
import { useAnnouncerJoke } from './useAnnouncerJoke';
import { TalentStage, type CurtainState } from './TalentStage';

type CastingStageProps = {
  bracketSize: 4 | 8;
  contestantsReady: number;
  startedAt: number;
  /**
   * Curtain position. `'open'` (default) - curtains parted, host visible.
   * `'closed'` - curtains drawn together, hiding the host. The parent
   * flips this to `'closed'` once generation completes so the curtain
   * dramatically falls before the showing-phase swap.
   */
  curtain: CurtainState;
};

/**
 * Casting screen - Gemma the host stands on the stage telling jokes while
 * the Gemma 4 model generates the contestants in the background. The
 * shared `.talent-stage` shell renders the proscenium, curtains,
 * spotlight, floor, and footlights; this component only contributes the
 * host, her speech bubble, and the contestant progress dots.
 */
export function CastingStage({
  bracketSize,
  contestantsReady,
  startedAt,
  curtain,
}: CastingStageProps) {
  // Warm Gemma's five mouth-state SVGs up-front so the lip-sync never
  // blinks while a cache miss resolves.
  useEffect(() => {
    preloadAvatar(GEMMA_AVATAR_SEED, GEMMA_AVATAR_OPTIONS);
  }, []);

  // When the curtains are closing, the host takes a bow and stops talking.
  const revealing = curtain === 'closed';
  const joke = useAnnouncerJoke({ startedAt, contestantsReady, revealing });
  const talking = !revealing;
  // Jittered cadence (with occasional micro-pauses) reads as speech
  // rather than a metronome - contestants get this feel from real
  // audio amplitude; the host has no audio so we synthesise it.
  const frame = useChatterMouth(talking);
  const mouth: MouthState = revealing
    ? 'laugh'
    : frame === 0
      ? 'smile'
      : 'agape';
  const svg = useMemo(
    () => renderAvatar(GEMMA_AVATAR_SEED, mouth, GEMMA_AVATAR_OPTIONS),
    [mouth],
  );

  return (
    <TalentStage
      phase="casting"
      curtain={curtain}
      marquee="🎪 Tonight's Talent"
    >
      <div className={`casting-host${revealing ? ' is-bowing' : ''}`}>
        <div
          className="casting-host-avatar"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="casting-host-name">{GEMMA_NAME}, your host</div>
        <div
          key={joke}
          className="casting-host-bubble"
          role="status"
          aria-live="polite"
        >
          {joke}
        </div>
      </div>
      <div
        className="stage-progress-dots"
        role="progressbar"
        aria-valuenow={contestantsReady}
        aria-valuemin={0}
        aria-valuemax={bracketSize}
        aria-label={`${contestantsReady} of ${bracketSize} contestants backstage`}
      >
        {Array.from({ length: bracketSize }, (_, i) => (
          <span
            key={i}
            className={`stage-progress-dot ${i < contestantsReady ? 'filled' : ''}`}
          />
        ))}
      </div>
    </TalentStage>
  );
}
