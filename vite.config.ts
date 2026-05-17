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
        manualChunks: {
          react: ['react', 'react-dom'],
          strudel: ['@strudel/web', '@strudel/core', '@strudel/transpiler'],
          zod: ['zod'],
        },
      },
    },
  },
});
