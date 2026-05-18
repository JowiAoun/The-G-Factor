import { useMemo } from 'react';
import { renderAvatar, type MouthState } from '../talent/avatar';
import type { Contestant } from '../talent/bracket';
import { useTalkCycle } from './useTalkCycle';

export type ContestantViewState =
  | 'idle'
  | 'playing'
  | 'winner'
  | 'loser'
  | 'champion';

function mouthFor(state: ContestantViewState, talkFrame: 0 | 1, dnf: boolean): MouthState {
  if (dnf) return 'angry';
  if (state === 'winner' || state === 'champion') return 'laugh';
  if (state === 'loser') return 'sad';
  if (state === 'playing') return talkFrame === 0 ? 'smile' : 'agape';
  return 'smile';
}

export function ContestantCard({
  contestant,
  state,
  side,
  onPlay,
  onStop,
  onChoose,
  compact,
}: {
  contestant: Contestant;
  state: ContestantViewState;
  side?: 'left' | 'right';
  onPlay?: () => void;
  onStop?: () => void;
  onChoose?: () => void;
  /** Used by the champion scene to omit the play/stop in favour of the parent's controls. */
  compact?: boolean;
}) {
  const isDnf = contestant.status === 'dnf';
  const talkFrame = useTalkCycle(state === 'playing');
  const mouth = mouthFor(state, talkFrame, isDnf);
  const svg = useMemo(
    () => renderAvatar(contestant.avatarSeed, mouth),
    [contestant.avatarSeed, mouth],
  );

  const classes = ['contestant', `state-${state}`];
  if (side) classes.push(`side-${side}`);
  if (isDnf) classes.push('is-dnf');
  if (state === 'playing') classes.push('is-playing');

  return (
    <div className={classes.join(' ')}>
      <div className="contestant-stage">
        <div
          className="contestant-avatar"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {state === 'winner' || state === 'champion' ? (
          <div className="sparkles" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <i
                key={i}
                style={{
                  ['--angle' as string]: `${i * 45}deg`,
                  ['--dist' as string]: `${state === 'champion' ? 80 : 56}px`,
                  ['--delay' as string]: `${i * 0.03}s`,
                }}
              />
            ))}
          </div>
        ) : null}
        {state === 'champion' ? <div className="crown" aria-hidden="true">👑</div> : null}
        {isDnf ? <div className="dnf-badge">DNF</div> : null}
      </div>
      <div className="contestant-name">{contestant.label}</div>
      {contestant.code && (
        <pre className="contestant-code">{contestant.code}</pre>
      )}
      {contestant.explanation && (
        <div className="contestant-expl">{contestant.explanation}</div>
      )}
      {!compact && (
        <div className="contestant-actions">
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
              Choose this one
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
