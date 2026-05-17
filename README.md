# Strudel Tutor — Gemma 4 Challenge

> AI that learns your musical taste as you live-code — running entirely in your browser on Gemma 4 E2B.

Built for the [DEV Gemma 4 Challenge](HACKATHON.md) (Build track). Pattern
Remix Studio with Taste Memory: paste a [Strudel](https://strudel.cc) pattern,
get three musically-coherent variations, like the ones you love, and watch the
model start predicting your taste — no fine-tuning, no GPU, no backend.

See [DEVPOST.md](DEVPOST.md) for the submission writeup.

## Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` in a Chromium-based browser with WebGPU enabled.
First load downloads ~1.5 GB of Gemma 4 E2B (q4 ONNX); cached after.

- Remix Studio (default): `http://localhost:5173/`
- 🎪 Talent Show: `http://localhost:5173/?talentshow` (or the tab in the header)
- Day-1 feasibility spike harness: `http://localhost:5173/?spike`

## 🎪 Talent Show — pairwise taste capture

Generate 4 (or 8) Strudel variations of the current seed, give each one a
cartoon `toon-head` avatar with a hash-derived face, then run them through a
single-elimination bracket where you pick the winner of every match. The
champion is auto-saved to taste memory with `avatar_seed` + `tournament`
metadata, so the sidebar grows little portraits of the variations you've
crowned and the few-shot retrieval gets head-to-head-verified preferences,
not just passive likes. Mouth, eyes, and pose all come from DiceBear; the
talking mouth swaps between `smile` and `agape` on a 150 ms cycle, winners
laugh and jump with sparkles, losers fade with a sad mouth.

## Keyboard

| Key | Action |
|-----|--------|
| `1` / `2` / `3` | Play variation 1/2/3 |
| `←` / `→` | Move focus between variations |
| `L` | Like the focused variation |
| `R` | Re-remix the current seed |
| `P` | Play the seed itself |
| `S` / `Esc` | Stop audio |

## How it works — three layers

1. **Static priors** (`src/model/prompts.ts`) — a ~600-token system prompt
   teaching Gemma the 13 Strudel mini-notation operators, 12 chain methods, and
   8 canonical idioms.
2. **Taste memory** (`src/memory/taste.ts`) — every ❤ and every 🏆 champion
   goes into IndexedDB; future remixes inject the top-3 most-similar liked
   variations as few-shot exemplars (character-bigram Jaccard similarity). The
   talent-show champions carry `avatar_seed` + `tournament` metadata so the
   sidebar can render their face.
3. **Parser firewall** (`src/strudel/parse.ts`) — every JSON output is parsed
   by `acorn` before display; invalid code triggers up to three retries with a
   hint, then drops the slot.

## Tech

- **Model:** Gemma 4 E2B via [@huggingface/transformers v4](https://huggingface.co/docs/transformers.js) — `Gemma4ForConditionalGeneration` + `AutoProcessor`, q4f16 ONNX, WebGPU primary with WASM fallback
- **Live coding:** [@strudel/web](https://strudel.cc), `@strudel/transpiler` for the parser firewall
- **Validation:** [zod](https://zod.dev) on the JSON output shape, 3-retry loop on invalid Strudel
- **Stack:** Vite · React 18 · TypeScript (strict) · IndexedDB
- **Deploy:** Vercel with `COOP: same-origin` / `COEP: require-corp` (required for transformers.js + WebGPU)

## License

MIT — see [LICENSE](LICENSE).
