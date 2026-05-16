# Strudel Tutor — Gemma 4 Challenge

> AI that learns your musical taste as you live-code — running entirely in your browser on Gemma 4 E2B.

Built for the [DEV Gemma 4 Challenge](HACKATHON.md) (Build track). Pattern Remix Studio with Taste Memory: paste a [Strudel](https://strudel.cc) pattern, get three musically-coherent variations, like the ones you love, and watch the model start predicting your taste — no fine-tuning, no GPU, no backend.

## Status

Phase 0 — Day 1 brutal feasibility spike. See [STRUDEL_PLAN.md](STRUDEL_PLAN.md) and [TODO.md](TODO.md).

## Run

```
pnpm install
pnpm dev
```

Open `http://localhost:5173` in a browser with WebGPU (Chrome 113+, Edge, or recent Firefox Nightly with the flag).

First-load downloads ~1.5 GB of Gemma 4 E2B (q4 ONNX); cached afterwards.

## Tech

- **Model:** Gemma 4 E2B (effective 2B) via [@huggingface/transformers](https://huggingface.co/docs/transformers.js) — WebGPU primary, WASM fallback
- **Live-coding:** [@strudel/web](https://strudel.cc) — JavaScript port of TidalCycles
- **Parser firewall:** `@strudel/core` transpiler validates every model output before it reaches the UI
- **Stack:** Vite + React + TypeScript + zod, deployable to Vercel with COOP/COEP headers

## License

MIT — see [LICENSE](LICENSE).
