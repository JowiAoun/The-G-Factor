import { useMemo } from 'react';
import { decodeMix, hasAnyMetadata } from '../studio/inspector';

export function MixInspector({ mixCode }: { mixCode: string }) {
  const meta = useMemo(() => decodeMix(mixCode), [mixCode]);
  if (meta.isEmpty || !hasAnyMetadata(meta)) return null;

  const tempoBits: string[] = [];
  if (meta.tempo.slow !== undefined) tempoBits.push(`slow×${meta.tempo.slow}`);
  if (meta.tempo.fast !== undefined) tempoBits.push(`fast×${meta.tempo.fast}`);
  if (meta.tempo.cpm !== undefined) tempoBits.push(`${meta.tempo.cpm} cpm`);

  const fxBits: string[] = [];
  if (meta.fx.reverb) fxBits.push('🌌 reverb');
  if (meta.fx.delay) fxBits.push('⏱ delay');
  if (meta.fx.filter) fxBits.push('🎚 filter');
  if (meta.fx.gain) fxBits.push('🔊 gain');

  return (
    <aside
      className="mix-inspector"
      aria-label="Mix metadata inspector"
    >
      <div className="mix-inspector-head">📊 Inspector</div>
      <dl className="mix-inspector-rows">
        {meta.samples.length > 0 && (
          <>
            <dt>Samples</dt>
            <dd>{meta.samples.join(', ')}</dd>
          </>
        )}
        {meta.synths.length > 0 && (
          <>
            <dt>Synths</dt>
            <dd>{meta.synths.join(', ')}</dd>
          </>
        )}
        {meta.noteFragments.length > 0 && (
          <>
            <dt>Notes</dt>
            <dd className="mono">{meta.noteFragments.join(' | ')}</dd>
          </>
        )}
        {meta.euclidPatterns.length > 0 && (
          <>
            <dt>Rhythm</dt>
            <dd>
              {meta.euclidPatterns
                .map((p) => `${p.hits} of ${p.steps}`)
                .join(', ')}
            </dd>
          </>
        )}
        {tempoBits.length > 0 && (
          <>
            <dt>Tempo</dt>
            <dd>{tempoBits.join(' · ')}</dd>
          </>
        )}
        {fxBits.length > 0 && (
          <>
            <dt>FX</dt>
            <dd>{fxBits.join(' · ')}</dd>
          </>
        )}
        {meta.layerCount > 0 && (
          <>
            <dt>Layers</dt>
            <dd>
              {meta.layerCount} stack call{meta.layerCount === 1 ? '' : 's'}
            </dd>
          </>
        )}
      </dl>
    </aside>
  );
}
