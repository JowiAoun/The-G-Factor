import { useEffect, useMemo } from 'react';
import { preloadAvatar, renderAvatar, type MouthState } from '../talent/avatar';
import { useTalkCycle } from './useTalkCycle';
import { useAnnouncerJoke } from './useAnnouncerJoke';
import { TalentStage, type CurtainState } from './TalentStage';

const HOST_AVATAR_SEED = 'buzz-the-host';
const HOST_NAME = 'Buzz';

type CastingStageProps = {
  bracketSize: 4 | 8;
  contestantsReady: number;
  startedAt: number;
  /**
   * Curtain position. `'open'` (default) — curtains parted, host visible.
   * `'closed'` — curtains drawn together, hiding the host. The parent
   * flips this to `'closed'` once generation completes so the curtain
   * dramatically falls before the showing-phase swap.
   */
  curtain: CurtainState;
};

/**
 * Casting screen — Buzz the host stands on the stage telling jokes while
 * Gemma generates the contestants in the background. The shared `.talent-stage`
 * shell renders the proscenium, curtains, spotlight, floor, and footlights;
 * this component only contributes Buzz, his speech bubble, and the
 * contestant progress dots.
 */
export function CastingStage({
  bracketSize,
  contestantsReady,
  startedAt,
  curtain,
}: CastingStageProps) {
  // Warm Buzz's five mouth-state SVGs up-front so the lip-sync never
  // blinks while a cache miss resolves.
  useEffect(() => {
    preloadAvatar(HOST_AVATAR_SEED);
  }, []);

  // When the curtains are closing, Buzz takes a bow and stops talking.
  const revealing = curtain === 'closed';
  const joke = useAnnouncerJoke({ startedAt, contestantsReady, revealing });
  const talking = !revealing;
  const frame = useTalkCycle(talking, 200);
  const mouth: MouthState = revealing
    ? 'laugh'
    : frame === 0
      ? 'smile'
      : 'agape';
  const svg = useMemo(() => renderAvatar(HOST_AVATAR_SEED, mouth), [mouth]);

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
        <div className="casting-host-name">{HOST_NAME}, your host</div>
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
