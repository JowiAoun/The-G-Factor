type Globals = typeof globalThis & {
  evaluate?: (code: string) => Promise<unknown> | unknown;
  hush?: () => void;
  samples?: (src: string) => Promise<unknown>;
};

type WebAudioModule = {
  initStrudel: (options?: {
    prebake?: () => Promise<unknown> | unknown;
  }) => Promise<unknown> | unknown;
  getAudioContext?: () => AudioContext;
};

let initialized = false;
let initPromise: Promise<void> | null = null;
let lastError: string | null = null;
let audioContext: AudioContext | null = null;

export function getLastError(): string | null {
  return lastError;
}

export function clearLastError(): void {
  lastError = null;
}

export function getStrudelAudioContext(): AudioContext | null {
  return audioContext;
}

export async function init(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const mod = (await import('@strudel/web')) as unknown as WebAudioModule;
    // @strudel/web's initStrudel attaches evaluate/hush/samples to globalThis.
    await mod.initStrudel({
      prebake: () => (globalThis as Globals).samples!('github:tidalcycles/dirt-samples'),
    });
    initialized = true;
    // Capture the AudioContext that superdough/strudel created so we can
    // hard-stop in-flight samples (suspend()) rather than relying on
    // `hush()` alone, which only halts the *scheduler* — already-triggered
    // sample sources keep playing through their natural decay.
    if (typeof mod.getAudioContext === 'function') {
      try {
        audioContext = mod.getAudioContext();
      } catch {
        // ignore — fall back to scheduler-only stop
      }
    }
  })();
  return initPromise;
}

export async function play(code: string): Promise<void> {
  await init();
  // A prior stop() may have suspended the context; resume before evaluating
  // so new pattern events can actually reach the speakers. Also covers the
  // first-click autoplay gate on browsers that suspend on page load.
  if (audioContext && audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch {
      // best effort — if resume fails the evaluate() call will surface it
    }
  }
  const g = globalThis as Globals;
  if (typeof g.evaluate !== 'function') {
    throw new Error('Strudel evaluate() not attached to globalThis after init');
  }
  try {
    await g.evaluate(code);
    lastError = null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    lastError = msg;
    throw err;
  }
}

/**
 * Stop the pattern AND any in-flight sample tails. `hush()` alone only
 * cancels the pattern scheduler — sample sources triggered just before the
 * call keep playing for their natural decay (a kick drum's body, a snare's
 * tail, an ambient pad's reverb wash). Suspending the AudioContext
 * additionally hard-mutes everything until the next `play()` resumes it.
 */
export function stop(): void {
  const g = globalThis as Globals;
  if (typeof g.hush === 'function') g.hush();
  if (audioContext && audioContext.state === 'running') {
    audioContext.suspend().catch(() => {});
  }
}
