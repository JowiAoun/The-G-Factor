# Strudel Tutor — an AI that learns your musical taste while you live-code

> Submitted to the [DEV Gemma 4 Challenge — Build track](HACKATHON.md).
> Code: <REPO_URL> · Live demo: <DEPLOY_URL> · License: [MIT](LICENSE)

I built a browser-native live-coding companion that gets better the more you use
it — not by retraining, not by hitting an API, but by *watching what you love*
and feeding it back into a 2-billion-parameter model that runs entirely on your
machine.

It's called **Strudel Tutor**. Two surfaces sit alongside each other. In the
**Remix Studio** you chat with **Bleep** — a cartoon producer toon — and Bleep
types updated [Strudel](https://strudel.cc) code back at you each turn ("add a
four-on-the-floor kick", "make the hats busier", "give it a bit of reverb").
Or sit down at the console yourself: the mix canvas is a real CodeMirror 6
editor, a 12-chip sound palette drags drums and synths straight into the code,
and `⌘+Enter` plays. Mixes auto-save to the browser, and a "Save as…" button
stashes named entries into a sidebar library. The **Talent Show** runs a single-elimination bracket
between four (or eight) Gemma-generated variations of a seed — each one told
to explore a different musical territory (polyrhythm, polyphony, modulation,
timbre, harmony, tempo, sparse, dense), each personified by another
toon-head; you listen to two at a time and crown your champion. Both
write surfaces feed the same per-browser **taste library** stored in IndexedDB,
so the model effectively **learns your style** within the session — no
fine-tuning, no GPU time, no weights changing.

## The three layers that teach the model

![Three-layer diagram: static priors → taste memory → parser firewall](<SCREENSHOT_DIAGRAM>)

**Layer 1 — Static priors (always present).** A ~600-token system prompt
listing Strudel's 13 mini-notation operators, 12 method chains, and 8 canonical
idioms. Gemma 4 almost certainly didn't see Strudel at training time; this is
how we tell it the rules without any fine-tuning.

**Layer 2 — Session-acquired taste.** Every like writes
`{seed_code, variation_code, transformation_label}` into IndexedDB. The next
remix scores each prior like against the current seed with a character-bigram
Jaccard similarity, and the top-3 are injected into the prompt as a labelled
*"this user has previously liked"* block. Warm state shines; cold-start still
works on priors alone.

**Two write surfaces feed Layer 2.** The **Remix Studio** is conversational:
Bleep watches your last six chat turns, looks at the current mix, and returns
the *full* new Strudel code as a JSON turn (`new_mix_code`, `assistant_message`,
`action_label`) — each round-trip gives you a snapshot you can play, undo, or
❤. The **Talent Show** is competitive: four (or eight) Gemma takes go into a
bracket; you pick the winner of each match; the champion auto-saves with
`avatar_seed` + `tournament` metadata so every preference is *head-to-head
verified*. Studio is "I want this specific change"; Talent Show is "surprise me,
I'll pick"; both populate the same taste store the next prompt reads from.

**Layer 3 — Parser firewall.** Every generated JSON gets parsed by `acorn`
before display — exactly the syntactic check Strudel's transpiler does as its
first step. Invalid code is silently retried up to three times with a
*"previous attempt was invalid because: …"* hint. Hallucinations of broken
syntax **never reach the UI**, and mini-notation runtime errors get caught by
the engine's try/catch around `evaluate()` so they surface as visible errors
instead of silent failures. The two-layer ground truth is what makes a 2B
model viable for a DSL the base model has barely seen.

## Why Gemma 4 E2B and not something bigger

I deliberately chose the smallest model in the family. The constrained-DSL
output, the parser-firewall, and the few-shot retrieval do the heavy lifting —
the model only needs to be good enough to map a seed plus 3 stylistic
exemplars into one short JSON object. E2B (effective 2B parameter, q4 ONNX)
loads in under two minutes on a mid-range laptop, runs comfortably on WebGPU,
and stays under the WASM memory ceiling if WebGPU is unavailable. E4B was kept
as the marginal-case fallback after a Day-1 brutal feasibility spike.

The model-choice story is the whole pitch: **a 2B model is *enough* when you
let the runtime carry the structure.**

An optional cloud backend via OpenRouter's `:free` tier of Gemma 4 31B is
wired in too — same prompts, same parser firewall, same axis directives — for
visitors without WebGPU or who want a faster bracket. A first-visit modal
picks Local vs Remote and a ⚙ button in the header switches any time.

## Demo

<DEMO_VIDEO_EMBED>

The 80-second demo: cold load → chat with Bleep to build a mix turn by turn
→ Save as → switch to the Talent Show → run a bracket → champion lands in the
taste sidebar with its toon-head portrait next to a 🏆.

![Cold load](<SCREENSHOT_LOAD>)
![Bleep mid-conversation](<SCREENSHOT_STUDIO>)
![Talent Show bracket in progress](<SCREENSHOT_BRACKET>)
![Taste sidebar with avatar portraits](<SCREENSHOT_TASTE>)

## Try it

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` in any WebGPU-capable Chromium-based browser. The
first load pulls ~1.5 GB of weights into the HTTP cache; every load after that
is instant. Network can go offline once cached — the whole loop (remix, like,
re-remix) runs without a server.

I didn't teach Gemma Strudel. I let Strudel teach Gemma — and let *you* teach
Gemma your taste.

---

**Tags:** #gemma4 #buildwithgemma4 #ai #webgpu

**Built with:** Gemma 4 E2B · `@huggingface/transformers` v4 · `@strudel/web` ·
DiceBear `toon-head` · React 18 · Vite · TypeScript · zod · IndexedDB ·
localStorage · acorn
