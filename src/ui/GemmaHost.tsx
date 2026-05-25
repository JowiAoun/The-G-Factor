import { useMemo } from 'react';
import { renderAvatar } from '../talent/avatar';
import { PERSONA } from '../studio/persona';

/**
 * Welcome banner displayed at the top of the Main Stage setup phase
 * (the canonical "/" landing) and reusable elsewhere if needed. Shows
 * a brass-framed portrait of Gemma alongside a marquee welcome and
 * a one-line introduction. Purely presentational: no audio reactivity
 * (the Persona card in the Rehearsal Room handles live mouth-sync).
 */
export function GemmaHost({
  title = 'Welcome to The G Factor',
  line,
}: {
  title?: string;
  /** Override the default "I'm Gemma, your host for tonight..." line. */
  line?: string;
}) {
  const svg = useMemo(
    () => renderAvatar(PERSONA.avatarSeed, 'smile', PERSONA.avatarOptions),
    [],
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
          <span className="gemma-host-sub">your host for tonight</span>
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
