import { useMemo } from 'react';
import { renderAvatar, type MouthState } from '../talent/avatar';
import { PERSONA } from '../studio/persona';
import { useTalkCycle } from './useTalkCycle';

/**
 * Bleep's mood drives the mouth state:
 *   idle      → smile (closed)
 *   thinking  → smile ↔ agape on a 200 ms cycle (lip-sync)
 *   saved     → laugh (after a successful "Save as…")
 *   apology   → sad   (after retries exhausted)
 */
export type PersonaMood = 'idle' | 'thinking' | 'saved' | 'apology';

function mouthFor(mood: PersonaMood, talkFrame: 0 | 1): MouthState {
  switch (mood) {
    case 'thinking':
      return talkFrame === 0 ? 'smile' : 'agape';
    case 'saved':
      return 'laugh';
    case 'apology':
      return 'sad';
    case 'idle':
    default:
      return 'smile';
  }
}

export function Persona({ mood = 'idle' }: { mood?: PersonaMood }) {
  const talkFrame = useTalkCycle(mood === 'thinking', 200);
  const mouth = mouthFor(mood, talkFrame);
  const svg = useMemo(
    () => renderAvatar(PERSONA.avatarSeed, mouth),
    [mouth],
  );
  return (
    <div className={`persona-card mood-${mood}`}>
      <div className="persona-stage">
        <div
          className="persona-avatar"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <div className="persona-name">{PERSONA.name}</div>
      <div className="persona-blurb">{PERSONA.blurb}</div>
    </div>
  );
}
