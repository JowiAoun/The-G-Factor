import { useMemo } from 'react';
import Particles, {
  ParticlesProvider,
  useParticlesProvider,
} from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine, ISourceOptions } from '@tsparticles/engine';

type StageSparklesProps = {
  /** Sparkles only emit while a performance is on. */
  active: boolean;
};

async function registerPlugins(engine: Engine): Promise<void> {
  await loadSlim(engine);
}

/**
 * Inner Particles wrapper - rendered only once the ParticlesProvider has
 * finished loading the slim plugin bundle.
 */
function StageSparklesInner() {
  const { loaded } = useParticlesProvider();
  const options = useMemo<ISourceOptions>(
    () => ({
      fullScreen: { enable: false },
      detectRetina: true,
      background: { color: { value: 'transparent' } },
      particles: {
        number: { value: 0 },
        color: { value: ['#ffe6a3', '#ffd86b', '#ffffff'] },
        shape: { type: 'circle' },
        opacity: {
          value: { min: 0.2, max: 0.85 },
          animation: {
            enable: true,
            speed: 1.2,
            sync: false,
            startValue: 'max',
            destroy: 'min',
          },
        },
        size: { value: { min: 1, max: 3 } },
        move: {
          enable: true,
          direction: 'top',
          speed: { min: 0.4, max: 1.4 },
          straight: false,
          outModes: { default: 'destroy' },
        },
        life: { duration: { value: { min: 2, max: 4 } }, count: 1 },
      },
      emitters: [
        {
          direction: 'top',
          rate: { delay: 0.12, quantity: 1 },
          position: { x: 50, y: 95 },
          size: { width: 90, height: 5 },
        },
      ],
    }),
    [],
  );

  if (!loaded) return null;
  return (
    <Particles id="stage-sparkles" className="stage-sparkles" options={options} />
  );
}

/**
 * Ambient gold-and-white sparkle layer that drifts up from the audience
 * area while a performer is playing. Pure decorative - emits from the
 * bottom band of the stage and fades as particles rise.
 *
 * Lazy-loaded by TalentStage so the ~50 kB tsparticles payload only
 * lands on first playback.
 */
export default function StageSparkles({ active }: StageSparklesProps) {
  if (!active) return null;
  return (
    <ParticlesProvider init={registerPlugins}>
      <StageSparklesInner />
    </ParticlesProvider>
  );
}
