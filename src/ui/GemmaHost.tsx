import { useMemo } from 'react';
import { renderAvatar, type MouthState } from '../talent/avatar';
import { PERSONA } from '../studio/persona';
import { useTalkCycle } from './useTalkCycle';
import { useAudioMouth } from './useAudioMouth';
import { useBlinkCycle } from './useBlinkCycle';
import type { PersonaMood } from './Persona';

type GemmaHostProps = {
  title?: string;
  /** Eyebrow line shown next to the ON AIR lamp. */
  sub?: string;
  /** Override the default body line. */
  line?: React.ReactNode;
  /** Drives the avatar's mouth state. When omitted, the portrait sits
   *  on a static smile (Main Stage welcome). When provided, the avatar
   *  reacts to Gemma's mood and to live audio amplitude (Rehearsal
   *  Room playback). */
  mood?: PersonaMood;
  /** True while Strudel is playing audio; used together with mood for
   *  the audio-driven lip-sync state. */
  playing?: boolean;
};

function mouthFor(
  mood: PersonaMood | undefined,
  playing: boolean,
  thinkFrame: 0 | 1,
  audioFrame: 0 | 1,
): MouthState {
  if (!mood) return 'smile';
  switch (mood) {
    case 'saved':    return 'laugh';
    case 'apology':  return 'sad';
    case 'thinking': return thinkFrame === 0 ? 'smile' : 'agape';
    case 'idle':
    default:
      if (playing) return audioFrame === 0 ? 'smile' : 'agape';
      return 'smile';
  }
}

/**
 * Theatre host banner. One layout, two surfaces:
 *   - Main Stage setup phase: static portrait + welcome copy.
 *   - Rehearsal Room: same banner shape, but the portrait gets live
 *     mouth-sync (thinking-cycle when Gemma is generating, amplitude
 *     when audio is playing).
 */
export function GemmaHost({
  title = 'Welcome to The G Factor!',
  sub = 'your host for tonight',
  line,
  mood,
  playing = false,
}: GemmaHostProps) {
  const thinkFrame = useTalkCycle(mood === 'thinking', 200);
  const audioFrame = useAudioMouth(!!playing && mood !== 'thinking');
  const mouth = mouthFor(mood, playing, thinkFrame, audioFrame);
  // `bow` is a single-arc path that draws both eyes as closed crescents,
  // which is the closest toon-head ships to a real blink frame. Swap it
  // in for ~140ms at irregular 3-7s intervals.
  const blinking = useBlinkCycle();
  const avatarOptions = useMemo(
    () =>
      blinking
        ? { ...PERSONA.avatarOptions, eyes: ['bow' as const] }
        : PERSONA.avatarOptions,
    [blinking],
  );
  const svg = useMemo(
    () => renderAvatar(PERSONA.avatarSeed, mouth, avatarOptions),
    [mouth, avatarOptions],
  );
  return (
    <section className="gemma-host" aria-label="Hosted by Gemma">
      <div className="gemma-host-portrait" aria-hidden="true">
        <div
          className="gemma-host-avatar"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="gemma-host-plaque">{PERSONA.name}</div>
      </div>
      <div className="gemma-host-body">
        <div className="gemma-host-eyebrow">
          <span className="on-air-lamp" aria-hidden="true">
            <span className="on-air-dot" /> ON AIR
          </span>
          <span className="gemma-host-sub">{sub}</span>
        </div>
        <h2 className="gemma-host-title">{title}</h2>
        <p className="gemma-host-line">
          {line ?? (
            <>
              I'm <strong>{PERSONA.name}</strong>. Pick a bracket size below and
              I'll spin up the contestants. The crowd is ready when you are.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
