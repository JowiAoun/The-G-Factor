import { useMemo } from 'react';
import { renderAvatar, type MouthState } from '../talent/avatar';
import { PERSONA } from '../studio/persona';
import { useTalkCycle } from './useTalkCycle';
import { useAudioMouth } from './useAudioMouth';

/**
 * Bleep's mood drives the mouth state:
 *   idle      → smile (closed)
 *   thinking  → smile ↔ agape on a 200 ms cycle (lip-sync)
 *   saved     → laugh (after a successful "Save as…")
 *   apology   → sad   (after retries exhausted)
 */
export type PersonaMood = 'idle' | 'thinking' | 'saved' | 'apology';

function mouthFor(
  mood: PersonaMood,
  playing: boolean,
  thinkFrame: 0 | 1,
  audioFrame: 0 | 1,
): MouthState {
  switch (mood) {
    case 'saved':
      return 'laugh';
    case 'apology':
      return 'sad';
    case 'thinking':
      return thinkFrame === 0 ? 'smile' : 'agape';
    case 'idle':
    default:
      if (playing) return audioFrame === 0 ? 'smile' : 'agape';
      return 'smile';
  }
}

export function Persona({
  mood = 'idle',
  playing = false,
}: {
  mood?: PersonaMood;
  playing?: boolean;
}) {
  // Two mouth drivers: time-based for the model thinking (no audio yet),
  // amplitude-based for live playback (real lip-sync). pickMouth picks
  // whichever one matters for the current persona state.
  const thinkFrame = useTalkCycle(mood === 'thinking', 200);
  const audioFrame = useAudioMouth(playing && mood !== 'thinking');
  const mouth = mouthFor(mood, playing, thinkFrame, audioFrame);
  const svg = useMemo(
    () => renderAvatar(PERSONA.avatarSeed, mouth),
    [mouth],
  );
  const moodDescription =
    mood === 'thinking'
      ? 'is thinking'
      : mood === 'saved'
        ? 'is celebrating a save'
        : mood === 'apology'
          ? 'is apologising'
          : 'is listening';
  return (
    <div
      className={`persona-card mood-${mood}`}
      role="img"
      aria-label={`${PERSONA.name} ${moodDescription}`}
    >
      <div className="persona-stage" aria-hidden="true">
        <div
          className="persona-avatar"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <div>
        <div className="persona-name">{PERSONA.name}</div>
        <div className="persona-blurb">{PERSONA.blurb}</div>
      </div>
    </div>
  );
}
