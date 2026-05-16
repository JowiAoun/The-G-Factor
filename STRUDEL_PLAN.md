# Strudel Tutor — Hackathon Plan

> **Status:** pending approval
> **Target:** DEV Gemma 4 Challenge, Build track ([HACKATHON.md](HACKATHON.md))
> **Deadline:** 2026-05-24 11:59 PM PDT (9 days from 2026-05-15)
> **Predecessor plan:** [PLAN.md](PLAN.md) — Sigil heraldry idea, retained as the Day-1-gate fallback
> **Builder:** solo, laptop CPU + browser only, no GPU, no backend

---

## 1. Requirements Summary

Build a browser-native **Strudel learning companion** powered by Gemma 4 2B running locally via `@huggingface/transformers`. The product is a **Pattern Remix Studio with Taste Memory**:

1. User pastes or picks a starter Strudel pattern (e.g., `s("bd hh sd hh")`).
2. Gemma 4 2B proposes **3 musically-coherent variations**, each with a one-line explanation of what changed and a play button.
3. Strudel's own parser firewalls every output — invalid code never reaches the user.
4. Liked variations are saved to a per-session **taste library**; future calls retrieve the top-3 most-similar prior likes as few-shot exemplars. The model effectively **learns the user's style** within the session — no fine-tuning, no GPU, no weights changing.

The framing is **"AI that learns your musical taste as you live-code,"** not "AI that writes you a song." This sidesteps the unwinnable "can a 2B model compose?" question and reframes Gemma as a creative collaborator whose suggestions get better the more you use it.

### Why this idea wins on landscape
- **Audio is 0/110 in existing DEV submissions** (verified in [PLAN.md §Competitive Landscape](PLAN.md)) — strongest whitespace category.
- **"AI learns your taste in-browser"** = unique angle vs every "AI generates X" submission.
- **Strudel parser as hallucination firewall** = a technically credible answer to the "small models hallucinate" objection.
- **Model-choice story is clean:** 2B is enough *because* retrieval + parser-firewall do the heavy lifting; running in-browser is a real product feature for live-coders who don't want to install anything.
- **Demo thumbnail dominates:** an animated waveform / colored Strudel REPL beats a chat screenshot on DEV's submission grid.

---

## 2. The "Teaching the Model" Architecture

This is the conceptual heart of the project and the lead of the DEV writeup. Three layers, none of them weights-changing:

### Layer 1 — Static Priors (always present)
A ~600-token system prompt containing:
- The 13 mini-notation operators with one-line semantics (`*`, `/`, `~`, `[]`, `<>`, `,`, `?`, `:`, `!`, `@`, `|`, `( )`, `-`).
- The 12 most-used method chains (`.s`, `.note`, `.n`, `.gain`, `.room`, `.delay`, `.lpf`, `.fast`, `.slow`, `.rev`, `.jux`, `.every`).
- 8 canonical idiom examples (kick-only, kick+hat, euclidean, polyrhythm, ambient pad, alternation, stack, sometimes-variation).

**Why:** Gives the model concrete syntax knowledge it almost certainly didn't see at training time (Strudel is post-cutoff for the 2B base model in many cases).

### Layer 2 — Session-Acquired Taste (the "memory/learning" answer)
On every "❤️" the user gives a variation:
- Store `{seed_hash, variation_code, transformation_label, liked_at}` in IndexedDB.
- On the next remix call, compute similarity between the new seed and all prior liked seeds (v1: n-gram overlap on the seed code; v2: MiniLM embeddings if v1 is obviously weak).
- Top-3 most similar likes get injected into the prompt as few-shot exemplars: *"The user previously liked these variations for similar patterns: [...]"*.

**Why:** This is the in-browser learning the user wanted. The model gets contextually better at predicting *this user's taste* over the session — without any fine-tuning, GPU time, or weights changing. Cold-start works (priors alone), warm-state shines.

### Layer 3 — Parser Firewall (always-on)
Every Gemma JSON output runs through `@strudel/core` parse before display:
- Valid → ship to UI.
- Invalid → silent retry (up to 3 attempts with a "previous attempt was invalid because: <error>" hint).
- All 3 retries invalid → drop this slot; user sees 2 cards instead of 3.

**Why:** Strudel's own parser is the ground truth. Hallucinations of nonexistent operators never reach the user. This is the technical credibility that makes 2B viable.

> **Demo punchline (in the DEV post):** *"I didn't teach Gemma Strudel. I let Strudel teach Gemma — and let you teach Gemma your taste."*

---

## 3. Phased Execution Plan

### Phase 0 — Day 1 (May 15): Brutal Feasibility Spike — HARD GATE

**Goal:** Prove Gemma 4 2B can produce *musically interesting* (not just parseable) Strudel variations in the browser.

- Scaffold Vite + React + `@huggingface/transformers` + `@strudel/web@1.0.3` + `zod` + `idb`.
- Validate click → `evaluate('note("c e g")')` → `hush()` audio round-trip works on a mid-range laptop (no GPU).
- Validate Gemma 2B loads + generates in browser (WebGPU primary, WASM fallback). Measure cold load time and first-token latency.
- **Spike test:** 5 hand-picked seed patterns × 3 variations each = **15 outputs**. Listen honestly.
  - **PASS:** ≥10/15 parse via Strudel parser **and** ≥8/15 are subjectively "huh, that's actually cool."
  - **MARGINAL:** 6–9/15 cool → escalate to Gemma 4B, retest, only proceed if 4B passes.
  - **FAIL:** ≤5/15 cool → **pivot to Sigil** ([PLAN.md](PLAN.md)) by EOD Day 2, telescope its 9-day schedule into 7.
- Deliverable: `.omc/research/spike-day1.md` with timestamped log of all 15 outputs, listening notes, parse rates, and PASS/MARGINAL/FAIL verdict.

### Phase 1 — Days 2–3 (May 16–17): Core Remix Loop

- Zod schema for Gemma output: `{variation_code: string, transformation_label: string, explanation_one_line: string}`.
- `src/strudel/parse.ts` — wraps `@strudel/core` parse, returns `{valid: boolean, error?: string}`.
- `src/strudel/engine.ts` — `initStrudel()`, `evaluate()`, `hush()`, audio-context-on-first-click handling, async error capture.
- `src/model/gemma.ts` — model loader (progress callback for UI), prompt-templated generation, JSON parse + zod validate + 3-retry-on-invalid-Strudel loop.
- `src/model/prompts.ts` — the Layer-1 static priors (~600 tokens).
- `src/remix/index.ts` — orchestrator: seed → 3 parallel Gemma calls → parse-firewall → dedupe → return up to 3 valid variations.
- `src/ui/App.tsx` v1 — paste box, "Remix" button, 3 cards each with code + label + explanation + play button.
- **Deliverable:** end-to-end. User pastes 1 pattern, clicks Remix, hears 3 playable variations within ≤10s on a mid-range laptop.

### Phase 2 — Days 4–5 (May 18–19): Taste Memory

- IndexedDB schema (via `idb`): table `likes` with `{id, seed_code, variation_code, transformation_label, liked_at}`.
- `src/memory/taste.ts` — CRUD + similarity retrieval (`getTopKSimilar(seed, k=3)`).
- v1 similarity: simple n-gram overlap on `seed_code`. Cheap, deterministic.
- "❤️" button on each variation card; toast on save.
- Few-shot exemplar injection: `src/remix/index.ts` calls `getTopKSimilar` and injects the result into the prompt as a clearly-labeled *"this user has previously liked:"* section.
- Sidebar showing live taste count + 3 most recent likes; "Clear taste" button.
- **Deliverable:** after the user likes 5+ variations that share a transformation pattern (e.g., euclidean rhythms, slow filter sweeps), the next 3 variations should include ≥1 that uses the learned transformation. Test this manually with a scripted-bias check on Day 5.

### Phase 3 — Days 6–7 (May 20–21): Seed Gallery + Polish

- `src/seeds/gallery.ts` — 5–7 curated seed patterns, each with: pattern code, 1-line genre label, difficulty stars (1–3), preview ribbon.
  - Suggested set: minimal kick, kick+hat, euclidean drums, ambient pad, polyrhythm stack, alternating melody, breakbeat.
- Loading UX: model-download progress bar (~1.5GB quantized); show seed gallery cards as static playable previews *during* download so the user can do something while waiting.
- Audio polish: gain ceiling to prevent clipping, fade-in/out on play/stop, hush stops within 1s.
- Keyboard shortcuts: `1`/`2`/`3` play variations, `L` like the focused variation, `R` re-remix.
- Subtle visual: animate the currently-playing pattern's code (highlight active step).
- **Deliverable:** a stranger lands cold and reaches their first ❤️ in <90 seconds on a moderate-spec laptop after model download.

### Phase 4 — Day 8 (May 22): Deploy + Demo Recording

- Deploy to Vercel with `vercel.json` setting `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (required for transformers.js + WebGPU).
- Smoke-test the deployed URL on a second laptop (no dev cache).
- Record 60–90s demo video, take ≥3 cuts. Script:
  1. Cold load (sped up): seed gallery appears, model downloads, page becomes interactive.
  2. Click seed → Remix → 3 cards appear → play card 2 → hear variation.
  3. Like 2–3 variations that share a transformation.
  4. Click second seed → Remix → narrate: *"watch — it learned I like euclidean rhythms"* → play card showing the learned transformation.
  5. End on a closing waveform.
- Use OBS with system-audio capture; verify audio level on playback (not just OBS meter).
- Capture 4–6 screenshots for the DEV post: cold load, mid-remix, taste-sidebar-with-likes, learned-variation-card.

### Phase 5 — Day 9 (May 23): DEV Post + Submit

- ~500-word DEV post:
  - **Lead (domain hook):** *"I built an AI that learns your musical taste while you live-code — running entirely in your browser, on a 2B model."*
  - **The 3-layer pedagogy diagram** (priors → taste memory → parser firewall).
  - **Why 2B and not 4B** (paragraph 3-4): retrieval + parser-firewall + structured output let the smaller model carry the load; 4B was tested as fallback but unnecessary.
  - Embedded demo video.
  - Repo link with MIT license, run instructions, deploy URL.
- Submit before May 24 11:59 PM PDT.

---

## 4. Critical Files (greenfield — none exist yet)

| File | Purpose |
|------|---------|
| `package.json` | Vite + React + `@huggingface/transformers` + `@strudel/web@1.0.3` + `zod` + `idb` |
| `vercel.json` | Cross-origin isolation headers (COOP/COEP) for WebGPU + transformers.js |
| `src/strudel/engine.ts` | `initStrudel()` + `evaluate()` + `hush()` wrappers + audio-context-on-first-click |
| `src/strudel/parse.ts` | Parser firewall: `parse(code) → {valid, error?}` |
| `src/model/gemma.ts` | Model loader with progress, constrained-JSON generation, 3-retry loop on invalid Strudel |
| `src/model/prompts.ts` | Layer-1 static priors (~600 tokens: operators + chains + 8 canonical examples) |
| `src/memory/taste.ts` | IndexedDB CRUD + n-gram similarity retrieval |
| `src/remix/index.ts` | Orchestrator: seed + likes → prompt assembly → 3× generate → firewall → dedupe |
| `src/seeds/gallery.ts` | 5–7 curated seed patterns with metadata |
| `src/ui/App.tsx` | Main UI: gallery, paste box, variation cards, taste sidebar, model-loading state |
| `src/ui/VariationCard.tsx` | Code preview + explanation + play + like buttons |
| `src/ui/TasteSidebar.tsx` | Like count + recent likes + clear button |
| `README.md` | Overview, model rationale, dev/build/deploy instructions |
| `DEVPOST.md` | Draft submission post (filled in across Days 1–9) |
| `LICENSE` | MIT |
| `.omc/research/spike-day1.md` | Day-1 spike log (PASS/MARGINAL/FAIL decision artifact) |

---

## 5. Reusable Patterns / Libraries

- `@strudel/web@1.0.3` — umbrella package, bundles transpiler + core + mini + webaudio. **Pin this version.**
- `@strudel/core` parser exposed for the firewall layer.
- `@huggingface/transformers` for Gemma 2B in WebGPU/WASM. Consult HF docs via context7 on Day 1.
- `zod` for IR validation + retry-on-failure (same pattern from [PLAN.md](PLAN.md) Sigil approach).
- `idb` (5KB wrapper) for cleaner IndexedDB API.
- Cross-origin isolation: Vercel docs on COOP/COEP headers.
- Strudel official curriculum at strudel.cc/learn and strudel.cc/workshop as the reference for seed-pattern selection.

---

## 6. Acceptance Criteria (testable)

1. **End-to-end remix loop:** seed → 3 valid playable variations in ≤10s on mid-range laptop (8GB RAM, integrated GPU).
2. **Parser firewall:** across 50 generated variations in eval, **0** invalid Strudel snippets surface to the UI.
3. **Taste memory effect:** after ≥5 likes that share a transformation primitive (e.g., euclidean rhythms), the next 3 variations include ≥1 instance of that transformation. Measured manually on Day 5.
4. **Audio quality:** no clipping at default gain; `hush()` stops within 1s.
5. **First-like-time:** a fresh user reaches their first ❤️ in <90s post-model-download.
6. **Offline operation:** after initial load, complete the remix→like→remix loop with network disabled (airplane-mode demo'd in video).
7. **Demo video:** 60–90s, ≥1 visible "the model learned my taste" moment with audible difference.
8. **DEV post:** lead with domain hook (not tech-stack), 3-layer pedagogy diagram included, model-choice rationale in paragraph 3–4, embedded video + repo + deploy URL.

---

## 7. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Day-1 spike fails: Gemma 2B has no musical taste | Medium | Hard pivot gate to Sigil ([PLAN.md](PLAN.md)) by EOD Day 2, telescope to 7-day version |
| transformers.js Gemma 4 browser support gaps | Low-Med | Validate on Day 1 explicitly; fallback to OpenRouter free tier (loses "fully in-browser" pitch but ships) |
| Cross-origin isolation headers fail | Low | Vercel native support via `vercel.json`; secondary fallback GitHub Pages + Cloudflare Pages headers |
| Variations parse but sound boring | Medium | Caught by Day-1 spike; if marginal, add deterministic post-processing layer (force a `.gain()`, pick non-default samples, vary tempo on at least one of 3) |
| Model download too slow for demo (1.5GB) | Medium | Cache-first PWA semantics; static playable seed patterns visible during download so first impression is sound, not a progress bar |
| Audio plays badly in screen recording | Low | OBS system-audio capture configured + tested on Day 7, not Day 8 |
| Taste-memory similarity retrieval picks irrelevant likes | Medium | v1 = n-gram overlap (deterministic, easy to debug); upgrade to MiniLM embeddings only if v1 is clearly broken on Day 5 |
| Strudel `evaluate()` quirks (async, audio-context gating) cause silent failures | Low | Wrap in try/catch from Day 1; build a small "errors panel" component that surfaces engine errors visibly to the developer (hidden in production) |

---

## 8. Verification Steps

1. **Day 1:** spike log `.omc/research/spike-day1.md` with all 15 outputs + listening verdicts + go/no-go.
2. **Day 3:** smoke test 10 seeds × 3 variations = 30 outputs; manually verify all play without error.
3. **Day 5:** taste-memory bias test — script 5 likes that share `bd(3,8)` euclidean structure, then run remix on a fresh seed, verify ≥1 of 3 variations includes a euclidean.
4. **Day 7:** fresh-browser-profile cold-start test, time first-like; must be <90s.
5. **Day 8:** deploy verification — open Vercel URL on a clean second laptop, complete the end-to-end flow.
6. **Day 8:** recording check — playback the demo video on a phone (typical DEV reader environment) with default volume, verify audio is clear.
7. **Day 9:** DEV post checklist — domain hook lead, pedagogy diagram, model rationale, embedded video, repo URL, deploy URL, MIT license, screenshots.

---

## 9. Open Decisions Locked In

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audience | Coder learning music | DEV's reader skew + leverages JS familiarity; "live-coding" framing resonates |
| Primary model | Gemma 4 2B | Constrained DSL output + retrieval lets 2B carry; clean intentional-model story |
| Fallback model | Gemma 4 4B | Only if Day-1 spike is marginal on 2B |
| Hosting | Vercel | Native cross-origin isolation header support; free tier sufficient |
| Memory backend | IndexedDB via `idb` | Browser-native, no server, persists across sessions naturally |
| Similarity retrieval v1 | N-gram overlap | Deterministic, debuggable, no extra model |
| Similarity retrieval v2 | MiniLM embeddings | Only if v1 is obviously broken |
| License | MIT | DEV-friendly, hackathon-standard |
| Demo length | 60–90s | DEV thumbnail attention window |

---

## 10. Out of Scope (explicit)

- User accounts / cloud sync (taste memory is per-browser-profile by design — this is a *feature*, not a limitation)
- Multi-track / song arrangement (one pattern at a time)
- MIDI export
- Mobile-first UI (responsive but desktop-optimized for demo)
- Multilingual UI (English only per HACKATHON.md judging language constraint)
- Audio input (no mic, no file upload)
- Pattern-saving / sharing (read-only seed gallery, no user-authored seeds)

---

## 11. Backup Pivot

If the **Day-1 spike fails** (≤5/15 musically interesting outputs from both 2B and 4B):
- Cleanly fall back to **Sigil** ([PLAN.md](PLAN.md)) on Day 2.
- Telescope Sigil's 9-day schedule into 7: cut SVG library to 12 charges (vs ~30), drop the symbolism-explain pass.
- This is **not failure** — it's a deliberate de-risked path with the same architectural skeleton (browser-native, transformers.js, zod-validated IR, structured output → renderer).

---

## 12. What to Approve

This plan covers:
- ✅ Architecture (3-layer pedagogy answering "how does the model learn Strudel")
- ✅ Phased schedule (Day 1 hard gate + 4 build phases + submission)
- ✅ File-by-file scope
- ✅ Acceptance criteria, risks, verification
- ✅ Locked-in decisions (audience, model, hosting, etc.) — override any if disagreed
- ✅ Backup pivot plan to Sigil

**Pending your approval before any code is written.**
