import { useMemo } from 'react';
import { renderAvatar, type MouthState } from '../talent/avatar';
import type { Contestant } from '../talent/bracket';
import type { ContestantViewState } from './Contestant';
import { useAudioMouth } from './useAudioMouth';

function mouthFor(state: ContestantViewState, talkFrame: 0 | 1, dnf: boolean): MouthState {
  if (dnf) return 'angry';
  if (state === 'winner' || state === 'champion') return 'laugh';
  if (state === 'loser') return 'sad';
  if (state === 'playing') return talkFrame === 0 ? 'smile' : 'agape';
  return 'smile';
}

type PerformerProps = {
  contestant: Contestant;
  state: ContestantViewState;
  side?: 'left' | 'right';
  /** CSS pixel size of the avatar square. Defaults to 180; champion uses 240. */
  size?: number;
  onPlay?: () => void;
  onStop?: () => void;
  onChoose?: () => void;
};

/**
 * On-stage contestant: avatar + name placard + technique chip + ▶/⏹ + Choose.
 * Lives inside <TalentStage> (the `.talent-stage` shell). Code & explanation
 * are deliberately not rendered here — they belong below the stage in a
 * `.match-code-strip` so the performance area stays uncluttered.
 */
export function Performer({
  contestant,
  state,
  side,
  size,
  onPlay,
  onStop,
  onChoose,
}: PerformerProps) {
  const isDnf = contestant.status === 'dnf';
  const audioFrame = useAudioMouth(state === 'playing');
  const mouth = mouthFor(state, audioFrame, isDnf);
  const svg = useMemo(
    () =>
      renderAvatar(
        contestant.character.id,
        mouth,
        contestant.character.avatarOptions,
      ),
    [contestant.character, mouth],
  );

  const classes = ['performer', `state-${state}`];
  if (side) classes.push(`side-${side}`);
  if (isDnf) classes.push('is-dnf');
  if (state === 'playing') classes.push('is-playing');

  const wrapStyle =
    size != null
      ? ({ ['--perf-size' as string]: `${size}px` } as React.CSSProperties)
      : undefined;

  return (
    <div className={classes.join(' ')}>
      <div className="performer-avatar-wrap" style={wrapStyle}>
        <div
          className="performer-avatar"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {state === 'winner' || state === 'champion' ? (
          <div className="sparkles" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <i
                key={i}
                style={
                  {
                    ['--angle' as string]: `${i * 45}deg`,
                    ['--dist' as string]: `${state === 'champion' ? 96 : 70}px`,
                    ['--delay' as string]: `${i * 0.03}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        ) : null}
        {state === 'champion' ? (
          <div className="crown" aria-hidden="true">👑</div>
        ) : null}
        {isDnf ? <div className="dnf-badge">DNF</div> : null}
      </div>

      <div className="performer-placard">
        <div className="performer-name">{contestant.character.name}</div>
        <div className="performer-chip">{contestant.label}</div>
        <div className="performer-actions">
          {state === 'playing' ? (
            <button onClick={onStop} className="primary">
              ⏹ Stop
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="primary"
              disabled={isDnf || !onPlay}
            >
              ▶ Play
            </button>
          )}
          {onChoose ? (
            <button
              onClick={onChoose}
              disabled={isDnf || state === 'winner' || state === 'loser'}
              className="choose-btn"
            >
              Choose
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
