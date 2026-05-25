import { parse } from './parse';

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
let analyser: AnalyserNode | null = null;
// `getByteTimeDomainData` requires an ArrayBuffer-backed view (not the
// looser `ArrayBufferLike` that allows SharedArrayBuffer). Tighten the
// generic so the call typechecks under modern lib.dom.d.ts.
let timeDomainBuf: Uint8Array<ArrayBuffer> | null = null;

// Symbol-guarded so HMR-triggered re-init doesn't stack patches.
const PATCH_FLAG = Symbol.for('strudel-tutor.connect-patched');

export function getLastError(): string | null {
  return lastError;
}

export function clearLastError(): void {
  lastError = null;
}

export function getStrudelAudioContext(): AudioContext | null {
  return audioContext;
}

/**
 * The side-branch AnalyserNode connected in parallel with the audio
 * destination. Exposed so downstream visualizers (audiomotion-analyzer,
 * tsparticles emitters, performer aura) can plug into the same node
 * the mouth-sync amplitude loop already uses - one analyser, many
 * consumers. Null before the audio context exists.
 */
export function getStrudelAnalyser(): AnalyserNode | null {
  return analyser;
}

/**
 * Insert a side-branch `AnalyserNode` into Strudel's audio path.
 *
 * Strudel/superdough route every source through their internal graph and
 * finally `.connect(audioContext.destination)`. We have no public hook to
 * grab a master gain, but we DO control the AudioNode prototype. By
 * wrapping `AudioNode.prototype.connect`, every existing-or-future node
 * that connects to `destination` ALSO gets connected to our analyser as a
 * parallel branch - a fan-out is free in WebAudio's signal model. The
 * original `connect` is called first and its return value is preserved,
 * so existing audio routing is unchanged.
 *
 * Guarded by a global symbol so HMR-triggered re-inits don't double-wrap.
 */
function installAudioAnalyser(ctx: AudioContext): void {
  if (analyser) return;
  analyser = ctx.createAnalyser();
  // 512 bins give audiomotion-analyzer enough resolution for nice
  // octave-band visuals; the time-domain mouth/aura loops only read
  // peak amplitude so the larger buffer is essentially free for them.
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.6;
  // Allocate with an explicit ArrayBuffer so the type narrows to
  // Uint8Array<ArrayBuffer>, matching getByteTimeDomainData's signature.
  timeDomainBuf = new Uint8Array(new ArrayBuffer(analyser.fftSize));

  const proto = AudioNode.prototype as unknown as Record<symbol, boolean>;
  if (proto[PATCH_FLAG]) return;
  const original = AudioNode.prototype.connect;

  type ConnectFn = (
    this: AudioNode,
    target: AudioNode | AudioParam,
    output?: number,
    input?: number,
  ) => AudioNode | void;

  const patched: ConnectFn = function (this, target, output, input) {
    const result = (original as ConnectFn).call(this, target, output, input);
    if (
      analyser &&
      this !== analyser &&
      target instanceof AudioNode &&
      target === ctx.destination
    ) {
      try {
        (original as ConnectFn).call(this, analyser);
      } catch {
        // a source-less node, a wrong-channel-count node, etc - ignore;
        // the original connection already succeeded, audio still flows.
      }
    }
    return result;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (AudioNode.prototype as any).connect = patched;
  proto[PATCH_FLAG] = true;
}

/**
 * Peak time-domain amplitude in [0, 1], read from the side-branch analyser.
 * Returns 0 before the analyser exists (model not loaded, no audio yet).
 */
export function readAudioAmplitude(): number {
  if (!analyser || !timeDomainBuf) return 0;
  analyser.getByteTimeDomainData(timeDomainBuf);
  let peak = 0;
  for (let i = 0; i < timeDomainBuf.length; i++) {
    const dev = Math.abs(timeDomainBuf[i] - 128);
    if (dev > peak) peak = dev;
  }
  return Math.min(1, peak / 128);
}

// ── shared rAF dispatcher ────────────────────────────────────
// Multiple components subscribe to amplitude (persona + every visible
// contestant). One rAF loop reads the analyser once per frame and pushes
// the value to all subscribers - that's cheaper than each component
// running its own loop, and keeps every mouth in lock-step.

const amplitudeSubscribers = new Set<(amp: number) => void>();
let rafHandle: number | null = null;

function amplitudeTick(): void {
  const amp = readAudioAmplitude();
  for (const cb of amplitudeSubscribers) cb(amp);
  rafHandle = requestAnimationFrame(amplitudeTick);
}

export function subscribeAmplitude(cb: (amp: number) => void): () => void {
  amplitudeSubscribers.add(cb);
  if (rafHandle === null) rafHandle = requestAnimationFrame(amplitudeTick);
  return () => {
    amplitudeSubscribers.delete(cb);
    if (amplitudeSubscribers.size === 0 && rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  };
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
    // `hush()` alone, which only halts the *scheduler* - already-triggered
    // sample sources keep playing through their natural decay.
    if (typeof mod.getAudioContext === 'function') {
      try {
        audioContext = mod.getAudioContext();
        if (audioContext) installAudioAnalyser(audioContext);
      } catch {
        // ignore - fall back to scheduler-only stop
      }
    }
  })();
  return initPromise;
}

export async function play(code: string): Promise<void> {
  // Parser firewall - refuse unsafe code BEFORE booting Strudel or touching
  // the audio context. Catches both LLM-emitted prompt-injection attempts
  // (already filtered by the retry loop, but defence-in-depth) and code the
  // user typed or pasted directly into the editor.
  const safety = await parse(code);
  if (!safety.valid) {
    throw new Error(
      safety.reason === 'unsafe'
        ? `Refused to play: ${safety.error}`
        : `Invalid Strudel: ${safety.error}`,
    );
  }

  await init();
  // A prior stop() may have suspended the context; resume before evaluating
  // so new pattern events can actually reach the speakers. Also covers the
  // first-click autoplay gate on browsers that suspend on page load.
  if (audioContext && audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch {
      // best effort - if resume fails the evaluate() call will surface it
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
 * Stop the pattern AND any in-flight sample tails.
 *
 * Important context: the global `hush()` that @strudel/web attaches does
 * NOT stop the scheduler. It just clears the named-pattern dictionary;
 * the most recently `setPattern()`'ed pattern keeps looping on the
 * scheduler forever. Suspending the AudioContext is the only thing that
 * actually silences ongoing output, so we always try it - the
 * `state === 'running'` guard that used to live here let audio sneak past
 * stop in two cases: (1) when the context was momentarily 'suspended'
 * because a prior stop() had just suspended it before a re-init, and
 * (2) when a `play()` was mid-flight and had not yet resumed the
 * context. suspend() is idempotent on an already-suspended context, so
 * dropping the guard is safe.
 */
export function stop(): void {
  const g = globalThis as Globals;
  if (typeof g.hush === 'function') g.hush();
  if (audioContext) {
    audioContext.suspend().catch(() => {});
  }
}
