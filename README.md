# Strudel Tutor — Gemma 4 Challenge

> AI that learns your musical taste as you live-code — running entirely in your browser on Gemma 4 E2B.

Built for the [DEV Gemma 4 Challenge](HACKATHON.md) (Build track). Two surfaces
sit alongside each other: a chat-driven **Remix Studio** where you talk to a
cartoon producer named Bleep that types Strudel code back at you and saves
your mixes to disk, and a **Talent Show** that runs your seed through a
single-elimination bracket of Gemma-generated variations to capture
head-to-head-verified taste signals. No fine-tuning, no GPU, no backend.

See [DEVPOST.md](DEVPOST.md) for the submission writeup.

## Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` in a Chromium-based browser with WebGPU enabled.
First load downloads ~1.5 GB of Gemma 4 E2B (q4 ONNX); cached after.

- 🎛 Remix Studio (default): `http://localhost:5173/`
- 🎪 Talent Show: `http://localhost:5173/?talentshow` (or the tab in the header)
- Day-1 feasibility spike harness: `http://localhost:5173/?spike`

## 🎛 Remix Studio — chat with Bleep

The Studio is conversational. Bleep is a cartoon producer (a DiceBear
`toon-head` with a fixed seed so the face survives reloads). Type natural
language — "start with a four-on-the-floor kick", "add open hats on the
off-beats", "make the hats busier on every 4th cycle" — and Bleep replies
with a one- or two-sentence acknowledgement plus the full updated Strudel
mix. Every reply is a strict JSON turn:

```json
{
  "new_mix_code": "<full Strudel code after applying the change>",
  "assistant_message": "<1-2 sentences, in character>",
  "action_label": "<short tag like 'added kick', 'halved tempo', 'no-op'>"
}
```

Output goes through the same `acorn` parser firewall that the Talent Show
uses — invalid Strudel triggers up to three retries with the failure
reason passed back as a hint, then Bleep apologises and the mix stays put.

**Auto-save:** the working mix + chat history + undo/redo stacks are
written to `localStorage` on every successful turn, so a refresh resumes
exactly where you stopped. **💾 Save as…** names the current mix and adds
it to a sidebar library (capped at 30 entries, oldest evicted).

Animations: Bleep's mouth swaps `smile ↔ agape` every 200 ms while
generating, settles to `smile` at rest, flashes `laugh` after a successful
Save as, and `sad` with a small shake when retries run out.

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

Studio is the "talk-to-Gemma" write path; Talent Show is the "let Gemma
fight Gemma" write path; both feed the same IndexedDB taste store.

## Tech

- **Model:** Gemma 4 E2B via [@huggingface/transformers v4](https://huggingface.co/docs/transformers.js) — `Gemma4ForConditionalGeneration` + `AutoProcessor`, q4f16 ONNX, WebGPU primary with WASM fallback
- **Live coding:** [@strudel/web](https://strudel.cc), `acorn` for the parser firewall
- **Validation:** [zod](https://zod.dev) on the JSON output shape, 3-retry loop on invalid Strudel
- **Stack:** Vite · React 18 · TypeScript (strict) · IndexedDB (taste memory) · localStorage (studio drafts + saved mixes)
- **Deploy:** Vercel with `COOP: same-origin` / `COEP: require-corp` (required for transformers.js + WebGPU)

## License

MIT — see [LICENSE](LICENSE).
