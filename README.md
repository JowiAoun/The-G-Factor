*This is a submission for the [Gemma 4 Challenge: Write About Gemma 4](https://dev.to/challenges/google-gemma-2026-05-06)*

<!-- You are free to structure your post however you want. You might consider: walking through a local setup or fine-tuning experiment, writing a getting started guide for one of the Gemma 4 models, comparing the model variants and when to use each, or reflecting on what open-source models at this capability level mean for developers. Whatever your angle, make it yours. -->

<!-- Don't forget to add a cover image if you want! -->

![The G Factor main stage: a velvet talent-show theatre with Gemma-generated contestants](PASTE_COVER_IMAGE_URL)
<!-- COVER / SCREENSHOT A: upload screens/01-home-mainstage.png (the Talent Show main stage). dev.to also lets you set this as the post cover image in the editor settings. -->

In psychometrics there is a beautiful, slightly controversial idea called the **g factor**. The short version: across wildly different mental tasks (vocabulary, spatial puzzles, arithmetic, pattern matching) people who do well on one tend to do well on the others, and statisticians can squeeze that shared variance into a single number. One latent "general intelligence" that quietly predicts performance everywhere. 🧠

I built a browser app that makes a 2-billion-parameter model write music, and I named it **The G Factor** on purpose. Not as a cute pun (although it is one, three times over), but because the name is the whole argument I want to make: **you do not need a giant model to look generally capable across a diverse range of tasks. You need a small model in the right harness.**

## The name is the thesis

The name pulls triple duty, and each meaning maps onto something the app actually does:

- The **G** in **Gemma**, the model doing all the work, fully on your machine.
- The **g factor** of psychometrics, one capacity stretched across many different tasks.
- The **"Factor"** in *X-Factor*, because the app is literally a talent show where you judge contestants. 🎤

<!-- HERO VIDEO (optional, but the asset is ready): the concept animation lives at public/assets/videos/bundle-a/g-factor-bundle-a.mp4. To use it, either upload it to YouTube and replace the commented line below with {% youtube YOUR_ID %}, OR convert it to a GIF, drag the GIF in, and use the ![]() image form. Left commented out so the post renders cleanly without it. -->
<!-- {% youtube PASTE_YOUTUBE_ID %} -->

That middle meaning is the one I keep coming back to. Lay the psychometric idea next to the app and it lines up almost suspiciously well:

| Psychometric **g factor** | **The G Factor** (the app) |
|---|---|
| One latent capacity that predicts performance across diverse tasks | One small Gemma model performing across diverse musical tasks |
| A battery of varied subtests | A bracket of 4 to 8 contestants |
| The individual subtests | 8 musical axes (polyrhythmic, polyphonic, modulated, timbral, harmonic, tempo-shifted, sparse, dense) |
| The examiner scoring each response | You, judging two contestants head to head |
| Adapting the test to the test-taker | A session taste memory that learns what you like |
| "Is it generally capable?" | "A 2B model is enough when the runtime carries the structure" |

The interesting question in intelligence research was never "how big is the brain." It was "where does general capability actually come from." That is exactly the question I find myself asking about small language models, so I built a music app to chase it.

## So what is it?

**The G Factor** is a browser-native live-coding companion for [Strudel](https://strudel.cc), a JavaScript dialect for writing music as code. There is no server doing the thinking. Gemma 4 runs *in your tab* on WebGPU, generates Strudel patterns, and you play them out loud.

There are two ways in. In the **Rehearsal Room** you chat with **Bleep**, a cartoon producer who rewrites the track turn by turn ("add a four-on-the-floor kick", "make the hats busier", "give it some reverb"). In the **Talent Show** you drop a seed and Gemma fields a bracket of contestants, each told to explore a different musical axis, and you crown a champion two at a time. Both feed the same taste memory. Here is a single generation, start to finish:

![One generation, end to end: request, retrieve taste, build prompt, generate, validate, play](PASTE_ONE_GENERATION_GIF_URL)
<!-- Upload: public/assets/videos/one-generation-theme/one-generation-theme.gif (swap to public/assets/videos/one-generation/one-generation.gif for the light version) -->

<!-- SCREENSHOT B: upload a fresh shot of the Rehearsal Room with Bleep mid-conversation (a few chat turns visible and code in the mix canvas). screens/02-rehearsal-room.png is close but re-take it with an active chat for the post. -->
![Chatting with Bleep in the Rehearsal Room](PASTE_REHEARSAL_ROOM_SCREENSHOT_URL)

That is the demo. The part worth writing about is *why a 2B model can do this at all*.

## Teaching a model a language it never saw

Here is the catch that makes this a real problem and not a toy: Gemma 4 almost certainly never saw Strudel during training. It is a niche live-coding DSL. So how do you get reliable, *playable* code out of a small model for a language it does not know?

You stop asking the model to know things, and you let the runtime carry the structure. Three layers do that, and this is the pattern I think transfers to any small-model-on-an-unfamiliar-domain problem.

![The three-layer teaching stack: static priors and session taste feed Gemma, the parser firewall guards the output](PASTE_THREE_LAYER_GIF_URL)
<!-- Upload: public/assets/videos/three-layer-stack-theme/three-layer-stack-theme.gif (swap to public/assets/videos/three-layer-stack/three-layer-stack.gif for the light version) -->

### Layer 1: static priors

A roughly 600-token system prompt that *is* the documentation the model never read: Strudel's mini-notation operators, the common method chains, and about 10 canonical idioms. This is not fine-tuning and it is not a vector database. It is a cheat sheet pinned to the front of every request. Cheap, deterministic, and it does most of the work.

### Layer 2: session taste

Every time you like a pattern, the app writes `{seed_code, variation_code, transformation_label}` into IndexedDB. On the next generation it scores your past likes against the current seed with a character-bigram Jaccard similarity, takes the top 3, and injects them as a labelled *"this user has previously liked..."* block.

That is the **"learns your taste"** claim, and it is honest: no weights move, no GPU time, no API call. The model adapts to you the way the psychometric test adapts to the test-taker, by feeding it the right few-shot context at the right moment. Cold start works on priors alone, and the experience just gets warmer the more you use it.

<!-- SCREENSHOT C (NEW): upload a shot of the taste sidebar populated, showing avatar thumbnails and the trophy badge (heart a few patterns or finish a tournament first). -->
![The taste sidebar filling up with liked patterns and tournament champions](PASTE_TASTE_SIDEBAR_SCREENSHOT_URL)

### Layer 3: the parser firewall

A small model *will* hallucinate broken syntax. So nothing it generates is trusted. Every output is parsed with `acorn`, validated against a `zod` schema, and walked for a deny-list of dangerous references before a single note plays. If it fails, the app retries up to 3 times with a hint that says *exactly* what was wrong ("previous attempt was invalid because: ..."). Invalid code never reaches the UI, and unsafe code (think `fetch`, `eval`, `localStorage`) never reaches the audio engine. 🔒

![The parser firewall: raw output runs through JSON parse, syntax check, and a security walk before it is allowed to play](PASTE_PARSER_FIREWALL_GIF_URL)
<!-- Upload: public/assets/videos/parser-firewall-theme/parser-firewall-theme.gif (swap to public/assets/videos/parser-firewall/parser-firewall.gif for the light version) -->

Priors tell the model the rules. Taste tells it your style. The firewall guarantees the output is real. None of those three layers is the model getting smarter. They are the *runtime* getting smarter, and that is the point.

## Why the smallest model was the right call

The judging rubric asks for intentional model selection, so let me be blunt about it: I picked the *smallest* model in the family on purpose, and I would defend that choice in a heartbeat.

The app uses **Gemma 4 E2B** (effective 2B parameters, q4f16 ONNX). It is around 1.5 GB on disk, loads in under two minutes on a mid-range laptop, runs comfortably on WebGPU, and falls back to WASM when WebGPU is missing. After the first download it needs *zero* network. The whole loop (generate, like, re-generate) runs offline.

Could I have reached for something bigger? Sure. But once the three layers carry the structure, the model's actual job shrinks to something tiny: take a seed plus 3 stylistic exemplars and emit one short JSON object. That is well within a 2B model's reach. Spending 30 billion parameters on a task this constrained would be paying for generality I already built into the harness.

<!-- SCREENSHOT E (NEW): upload the first-visit backend chooser modal (Local vs Remote cards). Open it with the gear button in the header if you have already chosen. -->
![The backend chooser: run Gemma locally on WebGPU, or via OpenRouter](PASTE_BACKEND_MODAL_SCREENSHOT_URL)

I did wire in an optional cloud path too, **Gemma 4 31B** via OpenRouter's free tier, for visitors without WebGPU or who want a faster bracket. Same prompts, same firewall, same axis directives. Judges can run it both ways and watch the small local model hold its own against its much larger sibling. *That* comparison, on identical scaffolding, is the most honest demo of the thesis I could ask for.

## The bigger picture

I think we are still over-indexed on model size. The instinct, when a small model stumbles, is to reach for a bigger one. But a lot of "the model is not smart enough" is really "the runtime is not doing its share."

Google does a version of this trick at scale: pre-loading, pre-fetching, doing cheap predictive work *before* you ask so the expensive step feels instant. The same idea applies to small models. A retrieval step, a constrained output schema, a validation firewall, a handful of well-chosen few-shot examples: these are cheap pre-calls that make a 2B model behave like something far larger, and they run on a laptop with no data leaving the machine.

If you take one practical thing from this post, take this: before you upgrade the model, ask what structure you can move out of the weights and into the runtime. Pin the rules. Retrieve the context. Validate the output. A small local model wrapped like that is private, offline-capable, free to run, and genuinely good enough for a surprising amount of real work. Try it on your own niche domain or DSL and I think you will be surprised how far E2B gets you.

## Gemma 4: the good, the bad, the ugly

I keep this section every time, because the honest notes are what I actually want to read in other people's posts.

### The good

E2B running *in a browser tab* still feels a little like magic. WebGPU inference is genuinely usable on mid-range hardware, and with the static priors in place Gemma's JSON-following was reliable enough that the retry path rarely fires past attempt one. For a model this small, on a language it never trained on, that is a great result.

### The bad

It never saw Strudel, full stop. Without the priors and the retry scaffolding it confidently invents operators that do not exist. The structure is doing real work here, and you feel it the moment you remove a layer. Local generation is also serial on a single WebGPU adapter, so a 4-contestant bracket has a real wait. I leaned into that instead of fighting it: a host toon named **Buzz** tells rotating jokes during the casting window and slips into a "patience mode" pool if it drags. A forced wait became part of the show.

<!-- SCREENSHOT D (NEW): upload the casting stage with Buzz mid-joke and the progress dots filling in (open /?talentshow and start a bracket). -->
![Buzz the host filling the generation wait with jokes while contestants are cast](PASTE_CASTING_STAGE_SCREENSHOT_URL)

### The ugly

The browser-ML reality: the first model download is large, WebGPU support is uneven across browsers, and there is a memory ceiling you can absolutely faceplant into if you are not careful. The fixes were unglamorous but they worked: cache aggressively after first load, fall back to WASM when WebGPU is unavailable, and keep the model's actual job small so memory pressure stays manageable. None of it is exotic, but it is the difference between a demo that works on your machine and one that works on a stranger's.

## Demo

The whole thing is live and runs entirely client-side:

**Live demo:** https://the-g-factor.vercel.app/

<!-- DEMO VIDEO (optional): if you record a walkthrough, upload it to YouTube and replace the line below with {% youtube YOUR_ID %}. Left commented out so the post renders cleanly without it. -->
<!-- {% youtube PASTE_DEMO_VIDEO_ID %} -->

```bash
pnpm install
pnpm dev
```

Open it in any WebGPU-capable Chromium browser. The first load pulls the weights into the HTTP cache; after that you can go fully offline and the whole loop still works.

## What's next

A few threads I want to pull: audio-reactive avatars so the toon-heads actually mouth along to their own track, swapping the bigram similarity for small on-device embeddings so the taste memory gets sharper, and leaning harder into the "cheap pre-call" idea, doing predictive generation in the background so the next contestant is ready before you ask for it. The pre-loading vision is where I think small local models get genuinely exciting.

I did not teach Gemma to write Strudel. I let the runtime teach it, and I let *you* teach it your taste. If you build something with a small Gemma, drop it in the comments, I would love to see how far you push E2B. 😁

{% embed https://github.com/JowiAoun/Gemma4 %}

<!-- Thanks for participating! -->
