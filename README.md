# Strudel Tutor - Gemma 4 Challenge

> AI that learns your musical taste as you live-code - running entirely in your browser on Gemma 4 E2B.

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

## Backends

On first visit a modal asks where to run Gemma:

- **Local** (default) - Gemma 4 E2B via `@huggingface/transformers` on
  WebGPU/WASM. ~1.5 GB one-time download, cached after, zero network
  calls during generation.
- **Remote** - `google/gemma-4-31b-it:free` via OpenRouter. No download,
  faster contestants. The user supplies their own OpenRouter key in the
  modal; the key lives in `localStorage` for that browser only and is
  never bundled into the deployed site or proxied through any server.

The choice persists in `localStorage` and can be flipped any time via
the ⚙ button in the header.

## 🎛 Remix Studio - chat with Bleep

The Studio is conversational. Bleep is a cartoon producer (a DiceBear
`toon-head` with a fixed seed so the face survives reloads). Type natural
language - "start with a four-on-the-floor kick", "add open hats on the
off-beats", "make the hats busier on every 4th cycle" - and Bleep replies
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
uses - invalid Strudel triggers up to three retries with the failure
reason passed back as a hint, then Bleep apologises and the mix stays put.

**Auto-save:** the working mix + chat history + undo/redo stacks are
written to `localStorage` on every successful turn, so a refresh resumes
exactly where you stopped. **💾 Save as…** names the current mix and adds
it to a sidebar library (capped at 30 entries, oldest evicted).

**Editable canvas + sound palette:** Bleep isn't the only one who can
write code. The canvas is a CodeMirror 6 editor - type directly, syntax
colour and bracket matching included. Below it, a 12-chip **sound palette**
(7 drums + 5 synths) sits ready to be dragged into the editor; chips
also click-to-audition for ~600 ms so you can hear `piano` or `cp` before
deciding where it goes. `Ctrl/⌘ + Enter` plays the current mix, `Esc`
stops. The Studio's ↶ Undo button stays at "macro" granularity (one
click per chat turn, palette drop, or settled-typing burst) while
CM6's own per-keystroke history handles `⌘+Z` inside the editor.

Animations: Bleep's mouth swaps `smile ↔ agape` every 200 ms while
generating, settles to `smile` at rest, flashes `laugh` after a successful
Save as, and `sad` with a small shake when retries run out.

## 🎪 Talent Show - pairwise taste capture

Generate 4 (or 8) Strudel variations of the current seed, give each one a
cartoon `toon-head` avatar with a hash-derived face, then run them through a
single-elimination bracket where you pick the winner of every match. The
champion is auto-saved to taste memory with `avatar_seed` + `tournament`
metadata, so the sidebar grows little portraits of the variations you've
crowned and the few-shot retrieval gets head-to-head-verified preferences,
not just passive likes. Mouth, eyes, and pose all come from DiceBear; the
talking mouth swaps between `smile` and `agape` on a 150 ms cycle, winners
laugh and jump with sparkles, losers fade with a sad mouth.

**Axis-driven diversity.** Each contestant is pre-assigned a different
*musical axis* - polyrhythm, polyphony, modulation, timbre, harmony, tempo,
sparse, dense - and the prompt for that slot carries the axis directive
plus a micro-exemplar tailored to it. The lineup is a deterministic
seed-keyed Fisher-Yates over the 8 axes, so the same seed always casts the
same axis cohort while a new seed gets a fresh draw. Outputs target
layered `stack(...)` compositions (≈5-12 lines), so contestants sound
substantial individually and meaningfully different from each other.

## How it works - three layers

1. **Static priors** (`src/model/prompts.ts`) - a ~600-token system prompt
   teaching Gemma the 13 Strudel mini-notation operators, 12 chain methods, and
   8 canonical idioms.
2. **Taste memory** (`src/memory/taste.ts`) - every ❤ and every 🏆 champion
   goes into IndexedDB; future remixes inject the top-3 most-similar liked
   variations as few-shot exemplars (character-bigram Jaccard similarity). The
   talent-show champions carry `avatar_seed` + `tournament` metadata so the
   sidebar can render their face.
3. **Parser firewall** (`src/strudel/parse.ts`) - every JSON output is parsed
   by `acorn` before display, then walked by `acorn-walk` to reject bare
   references to dangerous globals (`fetch`, `eval`, `localStorage`,
   `document`, etc.) and sandbox-escape primitives (`.constructor`,
   `.__proto__`, dynamic `import()`). Invalid code triggers up to three
   retries with the `(syntax)` vs. `(unsafe)` reason fed back to Gemma, then
   drops the slot. The same firewall guards `engine.play()` so user-typed or
   pasted code in the editor goes through the check too.

Studio is the "talk-to-Gemma" write path; Talent Show is the "let Gemma
fight Gemma" write path; both feed the same IndexedDB taste store.

## Security model

The site is a static SPA - no server, no auth, no user PII beyond what the
user produces themselves. The two surfaces that matter:

- **OpenRouter API key**: only ever lives in `localStorage` per browser, set
  by the user via the chooser modal. Never bundled into the deployed code,
  never logged, never sent anywhere except as `Authorization: Bearer …` to
  `https://openrouter.ai/api/v1/chat/completions` over HTTPS.
- **JS evaluation**: Strudel evaluates user-ish code in the same origin as
  the app, so a stolen API key would be game-over if hostile code ran. The
  parser firewall (Layer 3 above) is the defense - an AST-walked deny-list
  of dangerous globals and member accesses. Defense in depth, not a sandbox;
  multi-step obfuscation could in principle bypass it, but no realistic
  Gemma output ever would. A proper isolation layer (iframe with the
  `sandbox` attribute) is an explicit follow-up - out of scope for now
  because it touches the entire audio pipeline.

The deploy also ships a strict `Content-Security-Policy` (only
`'self'`, OpenRouter, and the Hugging Face hub are reachable; `frame-
ancestors 'none'` blocks click-jacking), `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, and a `Permissions-Policy` that denies
camera, microphone, geolocation, payment, USB, and other sensor APIs we
never use. Headers are kept in sync between `vite.config.ts` (dev) and
`vercel.json` (prod).

`'unsafe-eval'` is unavoidable in `script-src` (both Strudel and
transformers.js need it). The AST deny-list bounds the surface that
unsafe-eval can reach.

## Tech

- **Model:** Gemma 4 E2B via [@huggingface/transformers v4](https://huggingface.co/docs/transformers.js) - `Gemma4ForConditionalGeneration` + `AutoProcessor`, q4f16 ONNX, WebGPU primary with WASM fallback
- **Live coding:** [@strudel/web](https://strudel.cc), `acorn` + `acorn-walk` for the parser firewall
- **Validation:** [zod](https://zod.dev) on the JSON output shape, 3-retry loop on invalid Strudel
- **Stack:** Vite · React 18 · TypeScript (strict) · IndexedDB (taste memory) · localStorage (studio drafts + saved mixes)
- **Deploy:** Vercel with `COOP: same-origin` / `COEP: require-corp` (for transformers.js + WebGPU) plus CSP + X-Frame-Options + Referrer-Policy + Permissions-Policy hardening

## License

MIT - see [LICENSE](LICENSE).
