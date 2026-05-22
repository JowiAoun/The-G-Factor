import { useEffect, useMemo } from 'react';
import { preloadAvatar, renderAvatar, type MouthState } from '../talent/avatar';
import { useTalkCycle } from './useTalkCycle';
import { useAnnouncerJoke } from './useAnnouncerJoke';

const HOST_AVATAR_SEED = 'buzz-the-host';
const HOST_NAME = 'Buzz';

type CastingStageProps = {
  bracketSize: 4 | 8;
  contestantsReady: number;
  startedAt: number;
  revealing: boolean;
};

/**
 * X-Factor casting screen. While the Gemma loop is generating
 * contestants (~100-200s on mid-range WebGPU), Buzz the host stands on
 * a spotlit stage telling jokes; contestants assemble unseen behind
 * red velvet curtains, signalled only by progress dots. When all are
 * ready, the parent flips `revealing` and the curtains slide outward.
 */
export function CastingStage({
  bracketSize,
  contestantsReady,
  startedAt,
  revealing,
}: CastingStageProps) {
  // Warm Buzz's five mouth-state SVGs up-front so the lip-sync never
  // blinks while a cache miss resolves.
  useEffect(() => {
    preloadAvatar(HOST_AVATAR_SEED);
  }, []);

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
    <div
      className={`casting-stage ${revealing ? 'is-revealing' : ''}`}
      role="region"
      aria-label="Casting stage"
    >
      <div className="stage-backdrop" aria-hidden="true" />
      <div className="stage-spotlight" aria-hidden="true" />
      <div className="casting-host">
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
      <div className="stage-curtain left" aria-hidden="true" />
      <div className="stage-curtain right" aria-hidden="true" />
    </div>
  );
}
