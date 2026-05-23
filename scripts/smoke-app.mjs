// Smoke test: import App.tsx via Vite's SSR loader. Stubs the browser
// globals that components touch at module-load / first-render time, so
// a throw is a real bug, not an environment mismatch. Used by `git
// bisect run` to locate the commit that broke the page.

class MemStorage {
  #m = new Map();
  get length() { return this.#m.size; }
  clear() { this.#m.clear(); }
  getItem(k) { return this.#m.has(k) ? this.#m.get(k) : null; }
  key(i) { return [...this.#m.keys()][i] ?? null; }
  removeItem(k) { this.#m.delete(k); }
  setItem(k, v) { this.#m.set(k, String(v)); }
}
globalThis.localStorage = new MemStorage();
globalThis.sessionStorage = new MemStorage();
globalThis.window = globalThis;
const stubEl = () => ({
  style: { webkitFontSmoothing: '' },
  setAttribute: () => {},
  appendChild: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
});
globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: () => null,
  createElement: stubEl,
  createElementNS: stubEl,
  createTextNode: () => ({ nodeValue: '' }),
  body: stubEl(),
  head: stubEl(),
  documentElement: stubEl(),
};
// navigator is read-only in modern Node; skip.
globalThis.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.performance = globalThis.performance ?? { now: () => Date.now() };

const { createServer } = await import('vite');

const server = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});

let exitCode = 0;
try {
  const mod = await server.ssrLoadModule('/src/ui/App.tsx');
  if (!mod.App) {
    console.error('FAIL: App export missing');
    exitCode = 1;
  } else {
    const React = await import('react');
    const { renderToString } = await import('react-dom/server');
    const html = renderToString(React.createElement(mod.App));
    console.log('RENDER_OK length=' + html.length);
  }
} catch (err) {
  console.error('FAIL', err.stack ?? err.message ?? String(err));
  exitCode = 1;
} finally {
  await server.close();
}
process.exit(exitCode);
