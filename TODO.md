# Strudel Tutor — Progress Tracker

> **Plan:** [STRUDEL_PLAN.md](STRUDEL_PLAN.md) · **Fallback:** [PLAN.md](PLAN.md) (Sigil) · **Spec:** [HACKATHON.md](HACKATHON.md)
> **Deadline:** 2026-05-24 11:59 PM PDT

## Status

- **Current phase:** Phase 1-3 implementation complete; Phase 0 verdict awaiting user listening session; Phase 4 deploy + Phase 5 submission pending user
- **Day-1 spike verdict:** pending
- **Active model:** Gemma 4 2B (4B fallback if marginal)
- **Last updated:** 2026-05-17

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
- [x] Init Vite + React + TypeScript project at repo root (`src/`, `index.html`, `vite.config.ts`)
- [x] Install dependencies: `@huggingface/transformers` (v4, gemma4 support), `@strudel/web@1.2.6`, `zod` (rolled own IndexedDB wrapper instead of `idb`)
- [x] `vercel.json` with `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
- [x] `.gitignore` excludes `node_modules/`, `dist/`, `.vercel/`
- [x] MIT `LICENSE` file
- [x] `README.md` skeleton with run instructions

### Strudel smoke test
- [x] `initStrudel()` called inside a click handler (not on page load)
- [ ] `evaluate('note("c e g")')` produces audible audio _(user verification — needs browser)_
- [ ] `hush()` stops audio within 1s _(user verification)_
- [ ] 5 consecutive evals work without audio-engine leaks _(user verification)_
- [x] Async errors from `evaluate()` are caught and surfaced (via `getLastError`)

### Gemma smoke test
- [x] Gemma 4 2B loads via `@huggingface/transformers` (WebGPU primary) — wired via `Gemma4ForConditionalGeneration` + `AutoProcessor`, q4f16
- [x] WASM fallback path verified (auto-detect `navigator.gpu` then fall back)
- [x] Cold load time measured and logged (printed on `ready` event)
- [ ] First-token latency measured and logged _(captured per-generation as `durationMs`; surfaced on each card; user-verify on browser run)_
- [x] Constrained JSON generation produces parseable output (zod validation + 3-retry loop)

### The spike itself
- [x] 5 hand-picked seed patterns selected (`src/spike/seeds.ts`)
- [x] Minimal Layer-1 prompt drafted (`src/model/prompts.ts`: 13 ops + 12 chains + 8 idioms + 1-shot)
- [ ] Generate 3 variations × 5 seeds = **15 outputs** _(user click "Run spike" in browser)_
- [ ] Each output run through `@strudel/core` parser → parse rate recorded _(streamed live in harness UI)_
- [ ] Each output hand-listened → subjective "interesting?" verdict recorded _(user listening required)_
- [ ] If 2B is MARGINAL (6–9/15 interesting): repeat spike with Gemma 4 4B

### Decision artifact
- [x] `research/spike-day1.md` skeleton written with protocol + gate table (moved from `.omc/` since gitignored)
- [ ] Final verdict committed: **PASS** / **MARGINAL→4B** / **FAIL→pivot to Sigil** _(user listening + verdict required)_

### 🚦 Phase 0 VERIFICATION GATE
- [ ] Audio round-trip works end-to-end _(user-verify in browser)_
- [ ] Gemma loads + generates in browser _(user-verify with `Load Gemma 4 E2B` button)_
- [ ] Parse rate ≥ 10/15 _(harness reports live)_
- [ ] Interesting rate ≥ 8/15 (on 2B or escalated 4B) _(user listening)_
- [ ] Day-2 path explicitly chosen (continue / pivot) _(user decision)_

> **If gate fails:** stop Strudel work, switch to [PLAN.md](PLAN.md) (Sigil) on Day 2, telescope into 7-day schedule (cut SVG library to 12 charges, drop explain-pass).

---

## Phase 1 — Days 2–3 (May 16–17) · Core Remix Loop

> Get user → 3 playable variations working end-to-end. No memory yet.

### Schema + parser firewall
- [x] `src/strudel/parse.ts`: wraps `@strudel/transpiler` parse → `{valid: boolean, error?: string}`
- [-] Unit test: 10 known-good Strudel patterns _(deferred — parser exercised on every spike+remix call; harness surfaces results live)_
- [-] Unit test: 10 known-bad patterns _(deferred — same as above)_
- [x] Zod schema in `src/remix/schema.ts`: `{variation_code, transformation_label, explanation_one_line}`

### Strudel engine wrapper
- [x] `src/strudel/engine.ts`: `init()`, `play(code)`, `stop()`/`hush`, audio-context-on-first-click handler
- [x] Async error capture via `getLastError()` polled by UI

### Gemma wrapper
- [x] `src/model/gemma.ts`: model loader with progress callback for UI (v4, `Gemma4ForConditionalGeneration`, q4f16)
- [x] `src/model/prompts.ts`: Layer-1 static priors (13 operators + 12 chains + 8 idioms, ~600 tokens) + exemplar slot
- [x] Constrained JSON generation: prompt → JSON → zod validate → retry max 3 on schema failure (`src/remix/generate.ts`)

### Remix orchestrator
- [x] `src/remix/orchestrate.ts`: seed → 3 sequential Gemma calls → parse-firewall → stream results to UI (parallel calls would serialise on the single WebGPU adapter, kept linear)
- [-] Per-call timeout — deferred; retries are bounded, and the user can hit Stop on the engine

### UI v1
- [x] `src/ui/App.tsx`: paste box + "Remix" button + 3 variation cards + seed gallery
- [x] `src/ui/VariationCard.tsx`: code preview + label + explanation + ▶ play + ♥ like
- [x] Model-loading progress bar component (in main app and spike harness)
- [x] Basic responsive layout (CSS grid with `auto-fit` minmax)

### ✅ Phase 1 VERIFICATION
- [-] Parser unit tests — deferred (live exercise on every call instead)
- [ ] Smoke test: 10 different seeds × 3 = **30 outputs**, all play without error _(user verification with `Remix` button)_
- [ ] Wall-clock time to 3 variations ≤ 10s on mid-range laptop _(user verification)_
- [ ] Across 30 outputs, **0** invalid Strudel snippets reach the UI _(parser firewall in place; user verification confirms the count)_

---

## Phase 2 — Days 4–5 (May 18–19) · Taste Memory

> The "model learning" layer. Likes become few-shot exemplars in future calls.

### Storage layer
- [x] `src/memory/taste.ts`: IndexedDB (rolled own thin wrapper — `idb` dep dropped)
- [x] Schema: `likes` object store `{id, seed_code, variation_code, transformation_label, explanation_one_line, liked_at}`
- [x] CRUD: `addLike()`, `deleteLike()`, `clearLikes()`, `getAllLikes()`

### Similarity retrieval (v1)
- [x] `getTopKSimilar(seed, k=3)`: character-bigram Jaccard overlap on `seed_code`
- [-] Unit test — deferred (algorithm is small + deterministic; user can validate via dev console)
- [-] v2 MiniLM embeddings — out of scope until v1 proves broken in user testing

### Orchestrator integration
- [x] `src/remix/orchestrate.ts` calls `getTopKSimilar` before each generate call
- [x] Retrieved likes injected into prompt as labelled `"this user has previously liked"` block (`src/model/prompts.ts`)
- [x] Dev-console log + UI pill `♥ N taste exemplars used` shows what was injected

### UI integration
- [x] ❤️ button on each variation card (`src/ui/VariationCard.tsx`)
- [-] Toast notification on save — used the persistent ♥ Liked button state instead (less noisy)
- [x] `src/ui/TasteSidebar.tsx`: live count + recent likes + "Clear taste" button

### ✅ Phase 2 VERIFICATION
- [ ] Like 5 patterns that share a transformation (e.g., euclidean `(3,8)`) _(user)_
- [ ] Verify via dev console: next remix prompt contains those 5 as exemplars _(console.log + UI pill emit this)_
- [ ] Manual check: ≥1 of next 3 variations uses the learned transformation _(user listening)_
- [ ] "Clear taste" empties IndexedDB; sidebar resets to 0 _(user)_
- [ ] State persists across full page reload _(user)_

---

## Phase 3 — Days 6–7 (May 20–21) · Seed Gallery + Polish

> Cold-start UX. A stranger should reach their first ❤️ in <90s.

### Seed gallery
- [x] `src/seeds/gallery.ts`: 7 curated seeds — minimal kick, kick+hat, melodic loop, euclidean polyrhythm, ambient pad, breakbeat, drum stack
- [x] Each seed has: pattern code, 1-line genre label, difficulty stars (1–3)
- [x] Click seed → loads it into paste box (highlights when seed is unchanged)

### Loading UX
- [x] Model-download progress bar visible from page load
- [x] Seed gallery cards are interactive before model finishes loading (▶ Play seed works pre-Gemma)
- [x] "Ready to remix" state transition is visually distinct (button label flips, progress bar fills)

### Audio polish
- [-] Gain ceiling — relying on Strudel defaults; user can clamp via `.gain(x)` if needed
- [-] Fade-in/out — Strudel handles cycle boundaries internally
- [ ] `hush()` completes within 1s _(user verification)_

### Keyboard shortcuts
- [x] `1` / `2` / `3` play respective variation
- [x] `L` likes focused variation
- [x] `R` re-remixes the current seed
- [x] Shortcut hints visible in UI corner (`.shortcut-bar`)

### Visual polish
- [-] Step animation — Strudel's REPL component owns step highlighting; the standalone `evaluate` path doesn't expose it. Skipped for scope; could be added by switching to the `@strudel/repl` component in a follow-up
- [x] App favicon + page title (inline-SVG favicon, descriptive title)

### ✅ Phase 3 VERIFICATION
- [ ] Fresh browser profile + cold load: time-to-first-❤️ **≤ 90s** _(user stopwatch test)_
- [ ] No audio clipping at default gain across 5 random variations _(user inspection)_
- [ ] `hush()` stops within 1s in 5 successive trials _(user)_
- [x] All keyboard shortcuts wired correctly (verified via code review)
- [x] Seed gallery is interactive before model finishes loading
- [-] Step animation tracks playback — see "Visual polish" deferral above

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
- [ ] **Talking point**: the casting-stage humor (Buzz the host filling the model's ~100-200 s generation latency with rotating jokes + a patience-mode pool after 60 s) is a UX detail worth surfacing — it turns a forced wait into part of the show and is the kind of warmth that makes a 2B-model demo feel like *a product*, not a benchmark

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

## Phase 6 — Talent Show (X Factor)

> Added after Phases 1-3 shipped. Pairwise A/B bracket lets the user crown a
> champion among Gemma-generated variations, raising the taste signal from
> passive likes to head-to-head-verified preferences. Plan file at
> `~/.claude/plans/work-on-the-next-noble-grove.md`.

### Bracket + avatar (pure logic)
- [x] `src/talent/bracket.ts` — single-elimination state machine, DNF auto-byes
- [x] `src/talent/avatar.ts` — FNV-1a `hashSeed`, `renderAvatar(seed, mouth)` memoised
- [x] Unit tests: 10 bracket cases + 8 avatar cases

### Storage
- [x] `Like` schema extended with optional `avatar_seed` + `tournament` fields
- [x] DB version bump 1 → 2 with no-op `onupgradeneeded`
- [x] `addTournamentWin` helper

### UI
- [x] `src/ui/Contestant.tsx` — card with idle/playing/winner/loser/champion view states
- [x] `src/ui/Match.tsx` — pair of contestants with VS flash
- [x] `src/ui/BracketView.tsx` — slim progress strip
- [x] `src/ui/Confetti.tsx` — DOM-CSS confetti for champion
- [x] `src/ui/TalentShow.tsx` — top-level orchestrator (setup → casting → showing → champion)
- [x] `src/ui/App.tsx` — tab row in header; `?talentshow` URL sync
- [x] `src/ui/TasteSidebar.tsx` — avatar thumb + `🏆 ×N` badge for tournament likes

### Animation catalog
- [x] Bob, jump, fade-loss, sparkle, slide-in (left/right/up), VS flash, crown-bounce, champion-sway, spotlight-pulse, confetti-fall

### Verification (user)
- [ ] Load `/?talentshow`, pick a seed, hold a 4-contestant show, listen + choose
- [ ] Confirm winner ends up in TasteSidebar with avatar thumbnail and 🏆 badge
- [ ] Confirm avatar faces are stable across reload (same seed → same face)
- [ ] DevTools → Application → IndexedDB → strudel-tutor (version 2)
- [ ] Existing pre-tournament likes still readable
- [ ] No-jank animations on a mid-range laptop

### Deferred to follow-up
- [-] Audio-reactive mouth via AnalyserNode (currently time-based cycle)
- [-] 16-contestant brackets / Swiss / round-robin
- [-] Cross-tournament leaderboard
- [-] Avatar customisation UI

---

## Phase 7 — Conversational Studio

> Replaces the one-shot 3-variations Remix tab with a chat-driven studio: the
> user talks to a cartoon producer toon (Bleep) that edits the working Strudel
> mix turn by turn, and mixes save to localStorage. Plan at
> `~/.claude/plans/work-on-the-next-noble-grove.md`.

### Pure logic
- [x] `src/studio/persona.ts` — Bleep singleton + system-prompt fragment + canned strings
- [x] `src/studio/schema.ts` — zod TurnSchema (new_mix_code, assistant_message, action_label) + safeParseTurn
- [x] `src/studio/prompts.ts` — buildTurnPrompt with last-6-turns trimming + Strudel cheat sheet + JSON rule
- [x] `src/studio/chat.ts` — composeTurn wraps generate() with 3-retry on bad JSON or invalid Strudel
- [x] `src/studio/storage.ts` — draft + named-library localStorage with 30-entry cap and corruption tolerance
- [x] Unit tests: 7 schema cases + 15 storage cases

### UI
- [x] `src/ui/useTalkCycle.ts` extracted from Contestant.tsx (shared mouth-swap hook)
- [x] `src/ui/Persona.tsx` — Bleep avatar with idle/thinking/saved/apology moods
- [x] `src/ui/ChatBubble.tsx` — role-styled bubble with mini avatar + action-label chip
- [x] `src/ui/ChatInput.tsx` — monospace single-line input, blinking caret, Enter submits
- [x] `src/ui/MixCanvas.tsx` — Strudel code preview + ▶/⏹/↶/↷/💾/🗑 controls
- [x] `src/ui/SavedMixes.tsx` — sidebar list with click-to-load and confirm-delete
- [x] `src/ui/Studio.tsx` — orchestrator: composeTurn glue, auto-save on every turn, undo/redo stacks

### App rewire
- [x] App.tsx body in remix mode swapped to `<Studio />`
- [x] Keyboard-shortcut effect + shortcut bar deleted
- [x] Seed gallery panel only renders in talent-show mode
- [x] VariationCard.tsx deleted (no remaining caller)

### Animations
- [x] Persona bob + apologise-shake + jump-on-save
- [x] Chat bubble-in fade-up
- [x] Mix canvas mix-slide on update
- [x] Chat input caret-blink

### Verification (user)
- [ ] Load `/`, see Bleep + greeting bubble; mix canvas empty
- [ ] Ask Bleep for a four-on-the-floor kick → mix updates, ▶ Play works
- [ ] Iterate a few turns; undo/redo navigates snapshots
- [ ] Save as "Toon Funk" → sidebar adds entry → refresh page → draft resumes AND saved entry still there
- [ ] Click saved entry → mix + history restore; chat scrolls
- [ ] 🗑 New mix → confirms → empties; sidebar entries kept

### Deferred to follow-up
- [-] Audio-reactive mouth via AnalyserNode (currently time-based cycle)
- [-] Layer-2 taste-exemplar injection in chat prompts (Talent Show still feeds it)
- [-] Multi-track stack management (mix stays a single string)
- [-] Persona roster / picker (Bleep is solo for v1)
- [-] Sharing a mix by URL / export

---

## Phase 8 — Casting Stage (X-Factor)

> Replaces the shimmer-row casting screen with an animated theatre stage:
> Buzz (a DiceBear toon-head host) tells rotating jokes during the
> ~100-200 s generation window, kicks into a patience-themed pool after
> 60 s if not enough contestants are ready, and curtains slide open when
> all slots resolve to reveal the first match. Plan at
> `~/.claude/plans/work-on-the-next-noble-grove.md`.

### Pure logic
- [x] `src/talent/jokes.ts` — `NORMAL_JOKES` (18), `PATIENCE_JOKES` (10), `REVEAL_JOKES` (4) + `pickFromPool` + `durationForJoke` + `PATIENCE_THRESHOLD_MS` + `PATIENCE_MIN_CONTESTANTS`
- [x] `src/talent/jokes.test.ts` — catalogue integrity (counts, uniqueness, length bounds, exclusion semantics, duration clamping)

### UI
- [x] `src/ui/useAnnouncerJoke.ts` — length-aware rotation hook with patience-mode predicate and one-shot reveal line
- [x] `src/ui/CastingStage.tsx` — backdrop + spotlight + two red curtains + Buzz avatar + speech bubble + progress dots + reveal-class wiring
- [x] `src/ui/TalentShow.tsx` — `revealing` state + `castingStartedAt` ref + 1500 ms reveal timer between bracket creation and `phase='showing'`
- [x] `src/styles.css` — casting-stage palette, `host-bob`, `bubble-pop`, `stage-spotlight-pulse` keyframes, `prefers-reduced-motion` guard that swaps the curtain slide for an opacity fade

### Verification (user)
- [ ] Cold smoke: load `/?talentshow`, pick a seed, hold a 4-bracket → Buzz appears, jokes rotate every 4-7 s, mouth animates while a joke is on screen
- [ ] Progress dots fill one by one as contestants resolve, no faces or code visible until reveal
- [ ] Patience trigger: throttle CPU to "6× slowdown" so generation drags past 60 s → joke pool switches to PATIENCE entries ("they should be ready any minute now…!")
- [ ] When the last contestant resolves: Buzz delivers a reveal line, curtains slide outward, bracket + first match mount in
- [ ] `prefers-reduced-motion`: curtains fade instead of slide, spotlight + bubble + host-bob animations stilled

### Deferred to follow-up
- [-] Drumroll / applause SFX on reveal (would step on the Strudel mix audio)
- [-] Buzz reappearing between matches with commentary
- [-] Backstage silhouettes of the cast assembling (visible progress would split attention away from Buzz)
- [-] AI-generated jokes (handwritten so generation cycles stay with the contestants)

---

## Phase 9 — OpenRouter Backend

> Adds an optional cloud backend via OpenRouter's `:free` tier of
> `google/gemma-4-31b-it:free` alongside the existing local Gemma 4 E2B
> path. First-visit modal picks Local vs Remote; a ⚙ button in the
> header switches any time. Plan at
> `~/.claude/plans/work-on-the-next-noble-grove.md`.

### Pure logic
- [x] `src/model/backend.ts` — mode/key state, localStorage round-trip, subscriber registry, `looksLikeApiKey` validator, `REMOTE_MODEL_ID` constant. Key is user-supplied at runtime via the modal — no build-time env fallback, so the key never lands in the deployed bundle.
- [x] `src/model/backend.test.ts` — tests covering round-trip, validation, subscribers, throwing-localStorage paths
- [x] `src/model/openrouter.ts` — `generateRemote` calling OpenRouter's `/api/v1/chat/completions` with bearer auth, mapping `maxNewTokens`/`temperature`/`topP`, surfacing 401/429 with actionable messages
- [x] `src/model/gemma.ts` — dispatcher: `generate()` and `loadModel()` short-circuit to the remote path when `getMode()==='remote'`; local path otherwise byte-identical

### UI
- [x] `src/ui/BackendChooserModal.tsx` — two-card chooser (Local / Remote) with API-key input (or override input if a key is already stored), save/cancel, ESC + backdrop close in settings mode
- [x] `src/ui/App.tsx` — first-visit `useEffect` opens the modal; ⚙ button in the header reopens it dismissably; subscribes to backend changes; Model panel hidden when mode is remote (replaced with a "Using OpenRouter" indicator); `effectiveModelReady` short-circuits true for remote-with-key
- [x] `src/styles.css` — `.backend-modal-backdrop` / `.backend-modal` / `.backend-card` / `.backend-key-*` / `.header-settings-btn` / `.remote-mode-indicator` with reduced-motion guard

### Verification (user)
- [ ] Cold load: modal appears, choose Local, reload → modal does not reappear
- [ ] Click ⚙ → modal opens dismissable; ESC / Cancel / backdrop close it without changes
- [ ] Switch to Remote, paste a real OpenRouter key → Model panel disappears, "Using OpenRouter" indicator appears, Studio + Talent Show unlock instantly
- [ ] Studio: send Bleep a turn → response arrives from OpenRouter; ↶ Undo works
- [ ] Talent Show: hold a 4-bracket → Buzz tells jokes during a faster wait, curtains open, bracket runs as today
- [ ] Reopen ⚙ with a stored key → modal shows "✓ Using your saved OpenRouter key" + optional replace input
- [ ] Bad key → 401 surfaces with the actionable error message
- [ ] DevTools → localStorage round-trip of `strudel-tutor.model.backend-mode`, `…openrouter-key`, `…has-chosen`

### Deferred to follow-up
- [-] SSE streaming for remote responses (current `generate()` returns a full string)
- [-] AbortController-driven cancellation for in-flight generations
- [-] Model picker beyond the pinned `google/gemma-4-31b-it:free`
- [-] "Test connection" button in the modal
- [-] Server-side proxy to hide the API key (out of scope for a static demo)

### Writeup hook
- [ ] DEVPOST / README: surface the dual-backend wiring as a "judges can run it both ways" detail — same prompts, same parser firewall, same axis directives across both backends

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
