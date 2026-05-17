# Strudel Tutor — an AI that learns your musical taste while you live-code

> Submitted to the [DEV Gemma 4 Challenge — Build track](HACKATHON.md).
> Code: <REPO_URL> · Live demo: <DEPLOY_URL> · License: [MIT](LICENSE)

I built a browser-native live-coding companion that gets better the more you use
it — not by retraining, not by hitting an API, but by *watching what you love*
and feeding it back into a 2-billion-parameter model that runs entirely on your
machine.

It's called **Strudel Tutor**. You paste or pick a starter pattern in
[Strudel](https://strudel.cc) — the JavaScript port of TidalCycles — and Gemma 4
E2B proposes three musically-coherent variations, each with a one-line
explanation and a play button. When you ❤ one, it goes into a per-browser
**taste library** stored in IndexedDB. On the next remix, your most-similar
likes get injected into the prompt as few-shot exemplars. The model effectively
**learns your style** within the session — no fine-tuning, no GPU time, no
weights changing.

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

**Layer 3 — Parser firewall.** Every generated JSON gets parsed by Strudel's
own `@strudel/transpiler`. Invalid code is silently retried up to three times
with a *"previous attempt was invalid because: …"* hint. Hallucinations of
nonexistent operators **never reach the UI**. Strudel's parser is the ground
truth that makes a 2B model viable for a DSL the base model has barely seen.

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

## Demo

<DEMO_VIDEO_EMBED>

The 80-second demo: cold load → pick a seed → remix → like a few variations
sharing a transformation → next remix surfaces that transformation, audibly.

![Cold load](<SCREENSHOT_LOAD>)
![Three variation cards](<SCREENSHOT_VARIATIONS>)
![Taste sidebar populated](<SCREENSHOT_TASTE>)
![Learned variation card](<SCREENSHOT_LEARNED>)

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
React 18 · Vite · TypeScript · zod · IndexedDB
