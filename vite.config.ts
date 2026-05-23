import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Replace the `__SW_VERSION__` placeholder in `public/sw.js` with a
// build-time-unique value, so each production bundle activates a fresh
// cache and the previous build's cached HTML/assets get purged on the
// service worker's `activate` event. Vite copies `public/sw.js` to
// `dist/sw.js` verbatim, so we patch the file after the copy in the
// `closeBundle` hook.
function swVersion(): Plugin {
  return {
    name: 'strudel-sw-version',
    apply: 'build',
    async closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js');
      const src = await readFile(swPath, 'utf8');
      const version = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      await writeFile(swPath, src.replaceAll('__SW_VERSION__', version));
    },
  };
}

// Security headers shared between dev (Vite) and prod (Vercel). Keep this
// in sync with `vercel.json` — the README's Security model section calls
// the duplication out explicitly. Notes on each directive live in
// `~/.claude/plans/work-on-the-next-noble-grove.md`.
//
// `unsafe-eval` + `wasm-unsafe-eval` in script-src are unavoidable:
// Strudel's runtime evaluates user JS via eval; transformers.js loads
// ONNX/WASM. The parser firewall in `src/strudel/parse.ts` rejects
// dangerous globals before any eval site is reached, so unsafe-eval is
// gated by an AST deny-list rather than left wide open.
//
// `script-src` policy differs between dev and prod:
//  - Prod: no `'unsafe-inline'` — we ship zero inline <script> blocks.
//  - Dev: Vite injects the React-Refresh preamble as an inline script
//    in index.html; blocking it kills HMR and leaves the React tree
//    unmounted (blank #root). We add `'unsafe-inline'` for dev only.
//    Production stays strict so the deployed surface isn't relaxed.
function buildCsp(mode: 'dev' | 'prod'): string {
  const scriptSrc =
    mode === 'dev'
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'"
      : "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'";
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self' https://openrouter.ai https://huggingface.co https://*.huggingface.co https://*.hf.co",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "object-src 'none'",
    "manifest-src 'self'",
    "media-src 'self' blob: data:",
  ].join('; ');
}

const permissionsPolicy = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'gyroscope=()',
  'accelerometer=()',
  'magnetometer=()',
  'payment=()',
  'usb=()',
  'midi=()',
  'serial=()',
  // `bluetooth=()` was rejected by Chrome as an unrecognized feature
  // and only added console noise — dropped.
].join(', ');

const securityHeaders = {
  // COOP/COEP — required for transformers.js + WebGPU + SharedArrayBuffer.
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  // CSP — primary defense against script injection and unintended network use.
  'Content-Security-Policy': buildCsp('dev'),
  // Clickjacking defense (CSP `frame-ancestors` is the modern equivalent;
  // X-Frame-Options is kept for older-browser coverage).
  'X-Frame-Options': 'DENY',
  // MIME-sniffing defense.
  'X-Content-Type-Options': 'nosniff',
  // Default referrer behaviour; OpenRouter still gets origin via the
  // explicit `HTTP-Referer` header we set in the fetch call.
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Deny all sensor / payment / serial / bluetooth / etc. APIs we never use.
  'Permissions-Policy': permissionsPolicy,
} as const;

export default defineConfig({
  plugins: [react(), swVersion()],
  server: { headers: securityHeaders, host: true },
  preview: { headers: securityHeaders },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  build: {
    // Model weights dwarf JS payload; the 500 kB warning is noise.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Only split the *eager* vendor deps. `@strudel/*` is imported
        // dynamically from `src/strudel/engine.ts` so Vite auto-creates a
        // separate chunk for it AND — crucially — does not generate a
        // `<link rel="modulepreload">` for that chunk in index.html. Listing
        // it under manualChunks would force-preload it on initial page
        // load (the chunk is ~770 kB / ~250 kB gzip; the user only pays
        // that cost when they hit Play for the first time).
        //
        // Function form so the codemirror split catches every transitive
        // @codemirror/* and @uiw/codemirror-* module without needing to
        // enumerate them by hand.
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react';
          }
          if (id.includes('node_modules/zod/')) {
            return 'zod';
          }
          if (
            id.includes('node_modules/@codemirror/') ||
            id.includes('node_modules/@uiw/react-codemirror') ||
            id.includes('node_modules/@uiw/codemirror-') ||
            id.includes('node_modules/@lezer/')
          ) {
            return 'codemirror';
          }
          return undefined;
        },
      },
    },
  },
});
