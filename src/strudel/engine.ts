type Globals = typeof globalThis & {
  evaluate?: (code: string) => Promise<unknown> | unknown;
  hush?: () => void;
  samples?: (src: string) => Promise<unknown>;
};

let initialized = false;
let initPromise: Promise<void> | null = null;
let lastError: string | null = null;

export function getLastError(): string | null {
  return lastError;
}

export function clearLastError(): void {
  lastError = null;
}

export async function init(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const mod = await import('@strudel/web');
    // @strudel/web's initStrudel attaches evaluate/hush/samples to globalThis.
    await mod.initStrudel({
      prebake: () => (globalThis as Globals).samples!('github:tidalcycles/dirt-samples'),
    });
    initialized = true;
  })();
  return initPromise;
}

export async function play(code: string): Promise<void> {
  await init();
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

export function stop(): void {
  const g = globalThis as Globals;
  if (typeof g.hush === 'function') g.hush();
}
