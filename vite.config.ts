import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// COOP/COEP are required for transformers.js + WebGPU + cross-origin isolated
// contexts (SharedArrayBuffer). Same headers go on Vercel via vercel.json.
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
} as const;

export default defineConfig({
  plugins: [react()],
  server: { headers: isolationHeaders, host: true },
  preview: { headers: isolationHeaders },
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
