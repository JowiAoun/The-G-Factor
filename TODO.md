# Strudel Tutor — Progress Tracker

> **Plan:** [STRUDEL_PLAN.md](STRUDEL_PLAN.md) · **Fallback:** [PLAN.md](PLAN.md) (Sigil) · **Spec:** [HACKATHON.md](HACKATHON.md)
> **Deadline:** 2026-05-24 11:59 PM PDT

## Status

- **Current phase:** ⏸ not started — plan pending approval
- **Day-1 spike verdict:** pending
- **Active model:** Gemma 4 2B (4B fallback if marginal)
- **Last updated:** 2026-05-16

## Legend

| Symbol | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Done |
| `[-]` | Skipped / deferred |
| 🚦 | HARD GATE — phase cannot complete until checked |

---

## Phase 0 — Day 1 (May 15) · Brutal Feasibility Spike 🚦

> Prove Gemma 4 2B can produce **musically interesting** Strudel variations in-browser. This phase has a hard pass/fail gate that decides whether the project lives.

### Environment scaffold
- [ ] Init Vite + React + TypeScript project at repo root (`src/`, `index.html`, `vite.config.ts`)
- [ ] Install dependencies: `@huggingface/transformers`, `@strudel/web@1.0.3`, `zod`, `idb`
- [ ] `vercel.json` with `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
- [ ] `.gitignore` excludes `node_modules/`, `dist/`, `.vercel/`
- [ ] MIT `LICENSE` file
- [ ] `README.md` skeleton with run instructions

### Strudel smoke test
- [ ] `initStrudel()` called inside a click handler (not on page load)
- [ ] `evaluate('note("c e g")')` produces audible audio
- [ ] `hush()` stops audio within 1s
- [ ] 5 consecutive evals work without audio-engine leaks
- [ ] Async errors from `evaluate()` are caught and surfaced

### Gemma smoke test
- [ ] Gemma 4 2B loads via `@huggingface/transformers` (WebGPU primary)
- [ ] WASM fallback path verified (force-disable WebGPU and retry)
- [ ] Cold load time measured and logged
- [ ] First-token latency measured and logged
- [ ] Constrained JSON generation produces parseable output

### The spike itself
- [ ] 5 hand-picked seed patterns selected (kick-only, kick+hat, melodic loop, polyrhythm, ambient pad)
- [ ] Minimal Layer-1 prompt drafted (operators + chains cheat sheet + 3-shot examples)
- [ ] Generate 3 variations × 5 seeds = **15 outputs**
- [ ] Each output run through `@strudel/core` parser → parse rate recorded
- [ ] Each output hand-listened → subjective "interesting?" verdict recorded
- [ ] If 2B is MARGINAL (6–9/15 interesting): repeat spike with Gemma 4 4B

### Decision artifact
- [ ] `.omc/research/spike-day1.md` written with all 15 outputs + parse verdicts + listening notes
- [ ] Final verdict committed: **PASS** / **MARGINAL→4B** / **FAIL→pivot to Sigil**

### 🚦 Phase 0 VERIFICATION GATE
- [ ] Audio round-trip works end-to-end
- [ ] Gemma loads + generates in browser
- [ ] Parse rate ≥ 10/15
- [ ] Interesting rate ≥ 8/15 (on 2B or escalated 4B)
- [ ] Day-2 path explicitly chosen (continue / pivot)

> **If gate fails:** stop Strudel work, switch to [PLAN.md](PLAN.md) (Sigil) on Day 2, telescope into 7-day schedule (cut SVG library to 12 charges, drop explain-pass).

---

## Phase 1 — Days 2–3 (May 16–17) · Core Remix Loop

> Get user → 3 playable variations working end-to-end. No memory yet.

### Schema + parser firewall
- [ ] `src/strudel/parse.ts`: wraps `@strudel/core` parse → `{valid: boolean, error?: string}`
- [ ] Unit test: 10 known-good Strudel patterns all return `valid: true`
- [ ] Unit test: 10 known-bad patterns all return `valid: false` with non-empty error
- [ ] Zod schema in `src/remix/schema.ts`: `{variation_code, transformation_label, explanation_one_line}`

### Strudel engine wrapper
- [ ] `src/strudel/engine.ts`: `init()`, `play(code)`, `hush()`, audio-context-on-first-click handler
- [ ] Async error capture surfaced through a callback

### Gemma wrapper
- [ ] `src/model/gemma.ts`: model loader with progress callback for UI
- [ ] `src/model/prompts.ts`: Layer-1 static priors (~600 tokens: 13 operators + 12 chains + 8 canonical examples)
- [ ] Constrained JSON generation: prompt → JSON → zod validate → retry max 3 on schema failure

### Remix orchestrator
- [ ] `src/remix/index.ts`: seed → 3 parallel Gemma calls → parse-firewall → dedupe → return ≤3 valid variations
- [ ] Per-call timeout (e.g., 8s) with graceful degradation to 2-card output

### UI v1
- [ ] `src/ui/App.tsx`: paste box + "Remix" button + 3 variation cards
- [ ] `src/ui/VariationCard.tsx`: code preview + label + explanation + ▶ play button
- [ ] Model-loading progress bar component
- [ ] Basic responsive layout (desktop-first, hackathon scope)

### ✅ Phase 1 VERIFICATION
- [ ] All parser unit tests pass
- [ ] Smoke test: 10 different seeds × 3 = **30 outputs**, all play without error
- [ ] Wall-clock time to 3 variations ≤ 10s on mid-range laptop
- [ ] Across 30 outputs, **0** invalid Strudel snippets reach the UI (parser firewall holds)

---

## Phase 2 — Days 4–5 (May 18–19) · Taste Memory

> The "model learning" layer. Likes become few-shot exemplars in future calls.

### Storage layer
- [ ] `src/memory/taste.ts`: IndexedDB via `idb` package
- [ ] Schema: `likes` object store `{id, seed_code, variation_code, transformation_label, liked_at}`
- [ ] CRUD: `addLike()`, `clearLikes()`, `getAllLikes()`

### Similarity retrieval (v1)
- [ ] `getTopKSimilar(seed, k=3)`: n-gram overlap on `seed_code`
- [ ] Unit test: ranks structurally-similar seeds above unrelated ones
- [ ] (v2 only if v1 obviously broken): MiniLM embeddings via transformers.js

### Orchestrator integration
- [ ] `src/remix/index.ts` calls `getTopKSimilar` before each generate call
- [ ] Retrieved likes injected into prompt as labeled `"this user has previously liked: …"` section
- [ ] Dev-console log shows which exemplars were retrieved (for debugging)

### UI integration
- [ ] ❤️ button on each variation card
- [ ] Toast notification on save
- [ ] `src/ui/TasteSidebar.tsx`: live count + 3 most recent likes + "Clear taste" button

### ✅ Phase 2 VERIFICATION
- [ ] Like 5 patterns that share a transformation (e.g., euclidean `(3,8)`)
- [ ] Verify via dev console: next remix prompt contains those 5 as exemplars
- [ ] Manual check: ≥1 of next 3 variations uses the learned transformation
- [ ] "Clear taste" empties IndexedDB; sidebar resets to 0
- [ ] State persists across full page reload

---

## Phase 3 — Days 6–7 (May 20–21) · Seed Gallery + Polish

> Cold-start UX. A stranger should reach their first ❤️ in <90s.

### Seed gallery
- [ ] `src/seeds/gallery.ts`: 5–7 curated seeds — minimal kick, kick+hat, euclidean drums, ambient pad, polyrhythm stack, alternating melody, breakbeat
- [ ] Each seed has: pattern code, 1-line genre label, difficulty stars (1–3)
- [ ] Click seed → loads it into paste box

### Loading UX
- [ ] Model-download progress bar visible from page load
- [ ] Seed gallery cards are playable as static previews during model download (so audio happens immediately)
- [ ] "Ready to remix" state transition is visually distinct

### Audio polish
- [ ] Gain ceiling enforced (prevent clipping at peak)
- [ ] Fade-in/out on play/stop (~50ms)
- [ ] `hush()` completes within 1s, verified across 5 rapid stops

### Keyboard shortcuts
- [ ] `1` / `2` / `3` play respective variation
- [ ] `L` likes focused variation
- [ ] `R` re-remixes the current seed
- [ ] Shortcut hints visible in UI corner

### Visual polish
- [ ] Currently-playing pattern's code highlights active step (basic step animation)
- [ ] App favicon + page title

### ✅ Phase 3 VERIFICATION
- [ ] Fresh browser profile + cold load: time-to-first-❤️ **≤ 90s** (stopwatch test)
- [ ] No audio clipping at default gain across 5 random variations (waveform inspection)
- [ ] `hush()` stops within 1s in 5 successive trials
- [ ] All keyboard shortcuts behave correctly
- [ ] Seed gallery is interactive before model finishes loading
- [ ] Step animation tracks playback accurately

---

## Phase 4 — Day 8 (May 22) · Deploy + Demo Recording

> Ship to a public URL and capture the demo video.

### Deploy
- [ ] `vercel.json` headers verified locally (curl deployed URL response headers)
- [ ] First Vercel deploy succeeds
- [ ] Cross-origin isolation confirmed via DevTools (`self.crossOriginIsolated === true`)
- [ ] Smoke test deployed URL on a **second device** (clean cache)

### Demo recording setup
- [ ] OBS configured with system-audio capture (not just OBS meter — verify on playback)
- [ ] Test recording on Day 7 (not Day 8) — leaves buffer to fix audio issues
- [ ] Browser zoomed for legible code in 1080p capture

### Demo video (60–90s)
- [ ] Take 1 — script:
  1. Cold load (sped up): seed gallery appears, model downloads, page becomes interactive
  2. Click seed → Remix → 3 cards appear → play card 2 → audible variation
  3. Like 2–3 variations sharing a transformation
  4. Click second seed → Remix → narrate "watch — it learned my taste" → play learned card
  5. Closing waveform
- [ ] Take 2 (insurance)
- [ ] Take 3 (insurance)
- [ ] Best take selected and exported as `demo.mp4`

### Screenshots
- [ ] Cold load
- [ ] Mid-remix (3 cards visible)
- [ ] Taste sidebar with likes populated
- [ ] Learned-variation card (with caption highlighting the influence)

### ✅ Phase 4 VERIFICATION
- [ ] Deployed URL completes end-to-end flow on a clean device
- [ ] COOP/COEP headers present (DevTools check)
- [ ] Demo video plays cleanly with audible audio on a phone (typical DEV reader env)
- [ ] Demo contains at least one visible/audible "AI learned my taste" moment
- [ ] All 4+ screenshots are sharp and on-brand

---

## Phase 5 — Day 9 (May 23) · DEV Post + Submit

> Write the story, link the artifacts, submit before the cutoff.

### Writeup
- [ ] `DEVPOST.md` finalized (~500 words)
- [ ] Lead paragraph leads with **domain hook**, not tech stack
- [ ] 3-layer pedagogy diagram included (priors → taste memory → parser firewall)
- [ ] Model-choice rationale appears paragraph 3–4 (why 2B sufficed)
- [ ] Embedded demo video
- [ ] Repo URL + deploy URL + MIT license link
- [ ] 4+ screenshots embedded with captions

### Submission
- [ ] Repo is public on GitHub
- [ ] `README.md` complete (overview, model rationale, run/deploy instructions)
- [ ] `LICENSE` is MIT
- [ ] DEV post matches the Gemma 4 Challenge **Build** submission template
- [ ] Correct tags applied per HACKATHON.md
- [ ] Post submitted **before 2026-05-24 11:59 PM PDT**

### ✅ Phase 5 VERIFICATION
- [ ] Self-review of DEV post against the four Build judging criteria (intentional model use, technical implementation, creativity/originality, usability)
- [ ] Submission confirmation visible on DEV
- [ ] All public links (repo, deploy, video) work in a private/incognito window
- [ ] No copy-paste artifacts in the final post

---

## Pivot Trigger (Phase 0 → Sigil)

If Phase 0's hard gate fails (≤5/15 interesting on both 2B and 4B):

1. Stop Strudel work immediately, no more than half a day spent debugging.
2. Switch to [PLAN.md](PLAN.md) (Sigil) on Day 2.
3. Telescope Sigil's 9-day schedule into 7 days:
   - Cut SVG library: 12 charges (vs ~30)
   - Drop symbolism-explain pass
   - Keep the rest of Sigil's plan intact
4. Reuse all Phase 0 scaffolding (Vite, React, transformers.js setup) — only the domain code changes.
