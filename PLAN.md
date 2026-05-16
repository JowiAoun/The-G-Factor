# Gemma 4 Challenge — Hackathon Idea Plan

## Context

You're entering DEV's **Gemma 4 Challenge** (Build track). Spec lives at `/home/jaoun/Hackathons/Gemma4/HACKATHON.md`.

- **Deadline:** May 24, 2026 (9 days from today, 2026-05-15).
- **Prize:** 5 × $500 USD in Build track — wide field, so the bar is "stand out," not "be competent."
- **Judging:** intentional model selection, technical implementation, **creativity/originality**, usability.
- **Your constraints:** solo builder, laptop CPU / browser / phone only → Gemma 4 **2B or 4B**, "unexpected domain" wow flavor, project-first, minimum-viable writeup.

This means the winning move is **a 2B/4B-shaped idea in a domain nobody else will touch**, that produces a **visually striking artifact** in a 30-second demo video. Big-model "agent debate" / "lifetime memory" ideas are out (no GPU). Embodied/RPi ideas are out (no hardware). The 2B/4B sweet spot is **structured text generation with rule scaffolding + a visual rendering layer** — small models are excellent at rule-following text when paired with a deterministic validator, and the visual layer is what photographs well.

## Competitive Landscape (as of 2026-05-16, ~110 submissions live)

I clustered every public submission. Every crowded category is a "do not enter" zone — the winning slot is whitespace.

### Heavily Occupied Clusters (avoid)

| Cluster | Representative submissions | Count |
|---|---|---|
| **Benchmarks / model comparisons** | Old PC vs New AI, GTX 1650 test, LM Studio benchmarking, Brain Float, KV FP8, vLLM tuning, n-gram speculative decoding, bf16, "Choosing the Right Gemma 4 Model" | ~12 |
| **Local/offline manifestos & opinion** | "End of API-Dependent AI", "Goldilocks Moment", "Rise of Practical Local AI", "Beyond the Hardware Barrier", "Game-Changer for Every Developer", "Means for Africa", "Economics of AI Access", student-perspective posts | ~15 |
| **Local code review / coding agent** | GemmaDiff, NeuroGuard, Ethica, OpenCode, ARIA Termux, SchemaWatch, "coding agent that runs on Gemma 4", "Coding in the Dark", "Night Gemma 4 Changed How I Write Code" | ~10 |
| **Multi-agent debate / tribunal** | Multi-Agent AI Tribunal, Agentic Debate Arena, "Argues With Itself", Emergency Command Team (×2), 4-Persona Engine, Consensus-hardening-protocol | ~7 |
| **NPCs / RPG / playable game** | GemMaster, Kenji's Ramen (×2), "GitHub Repo Into Playable Dungeon", "Gemma 4 Plays Snake", "Pattern Is All You Need (NPC Depth)" | ~6 |
| **JARVIS / personal assistant** | "Fully Local Iron Man J.A.R.V.I.S." (×2), "My Buddy and I", DiagramFlowAI, Lumina Creator OS, TSI Nexus, RefVault | ~7 |
| **RAG / docs / contradiction finder** | PolicyMind, Document Contradiction Analyzer, "Junior Developer Effect" 192k context, "Day My Laptop Read a Novel" | ~5 |
| **Mobile / Termux / phone** | "Ollama on a 4GB mobile GPU", "Termux & Gemma 4", "Coding on 6-inch Screen", "Healthcare AI on $150 phone" | ~5 |
| **RPi / embedded** | OpenClaw Pi 4B, LiteRT-LM on Orange Pi, Ethica RPi, Cinderella IoT, "Old PC" | ~5 |
| **Accessibility / a11y** | Accessibility Guardian (WCAG), GemmaBridge (neurodiverse), Iris (visual assistant PT-BR) | ~3 |
| **Vision OCR / whiteboard** | WhiteboardIQ (×2), Figma vs Code referee | ~3 |
| **Finance / business apps** | GemmaFin, AI-Powered ERP, TripSync travel, Hotel Receptionist, Skincare Tracker, Habit Tracker, AnsaMe exams, Fambai CV ATS, Bio-Neighbor 2nd opinion, Open-Rosalind, PolicyMind | ~12 |
| **Astronomy / science one-shots** | 118,000 Stars grounding, Real-Time Planetary Data, Research Synthesis Engine, Project Chameleon | ~4 |
| **Knowledge graph / visualization** | NexusGraph (D3), Sowser (infinite canvas), DiagramFlowAI | ~3 |
| **Browser-native zero-backend angle** | Sowser, NexusGraph, "Gemma 4 in the Browser", "Zero-Backend AI Apps", "Argues With Itself (WebGPU)" | ~5 |

### Whitespace (still wide open)

Domains where **zero submissions** exist as of today:

- **Heraldry / blazon / coat-of-arms generation** — empty
- **Constructed languages (conlangs) / phonology** — empty
- **Etymology trees / historical linguistics** — empty
- **Music composition / counterpoint / score generation** — empty (no audio-output submissions at all)
- **Archaeology / stratigraphy / typology** — empty
- **Crossword construction / cryptic clues / word puzzles** — empty
- **Knot recognition / tying tutorials** — empty
- **Beekeeping / hive diagnostics** — empty
- **Tarot / divination / symbolic systems** — empty
- **Cipher / cryptanalysis / historical ciphers** — empty
- **Origami / paper engineering / pattern generation** — empty
- **Sourdough / fermentation / microbiology lite** — empty
- **Mineralogy / fossil ID** — empty
- **Watch movements / mechanical reasoning** — empty
- **Bonsai / horticultural design** — empty

### Implications for our strategy

1. **"Browser-native zero-backend" is no longer differentiating.** Five submissions already lead with this. Our writeup must downplay the tech-stack story and lead with the **domain story** instead.
2. **"Visualization with D3/SVG" is partially taken** (NexusGraph, DiagramFlowAI, Sowser). Our visual output must be **immediately recognizable as not a graph** — a coat of arms, a musical score, a family-tree diagram, a stratigraphic column.
3. **All 4 of our top picks (Sigil, Etym, Lexica, Counterpoint) live in whitespace** — zero direct collisions. This is the bet.
4. **Avoid pivoting toward an "agent debate" / "JARVIS" / "code reviewer" / "benchmark" frame** under time pressure — those are saturated graveyards.

## Star-Rated Idea Table

Scored 1–5★ on six axes plus a **Collision Risk** column measured against the 110 existing submissions. Composite is the unweighted mean of the six scoring axes, rounded to one decimal. *Wow* and *Originality* are double-weighted in the recommendation. **Collision Risk** is a tiebreaker — anything red is disqualified regardless of composite.

| # | Idea | Wow | Originality | Model Fit (2B/4B) | 9-Day Solo Feasibility | Demo-ability | Real Utility | Composite | Collision Risk | Pick |
|---|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | **Sigil** — NL → formal heraldic blazon → live-rendered SVG coat of arms | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★☆☆ | **4.7** | 🟢 None | 🏆 |
| 2 | **Etym** — Interactive etymological tree explorer with semantic-drift narration | ★★★★☆ | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★★★ | ★★★★☆ | **4.3** | 🟡 Adjacent to NexusGraph (D3 viz) — differentiated by domain | 🥈 |
| 3 | **Lexica** — Constructed-language generator with phonology + morphology rule checker | ★★★★☆ | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★☆☆ | **4.2** | 🟢 None | 🥉 |
| 4 | **Cryptic** — Themed crossword constructor (NYT-style) with clue cleverness scoring | ★★★★☆ | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★★☆ | **4.2** | 🟢 None | |
| 5 | **Counterpoint** — Browser-side Bach-style two-voice composer with visible reasoning | ★★★★★ | ★★★★★ | ★★★☆☆ | ★★★☆☆ | ★★★★★ | ★★★☆☆ | **4.0** | 🟢 None (zero audio-output submissions) | |
| 6 | **Strata** — Browser archaeological stratigraphy reasoner with animated dig column | ★★★★☆ | ★★★★★ | ★★★☆☆ | ★★★☆☆ | ★★★★☆ | ★★★☆☆ | **3.8** | 🟢 None | |
| 7 | **Murmur** — Beekeeping hive-audio diagnostician (audio features + 4B reasoning) | ★★★★★ | ★★★★★ | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ | ★★★★☆ | **3.8** | 🟢 None | |
| 8 | **Hexcrawl** — Solo-TTRPG procedural hex-map narrator with regional consistency | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ★★★★☆ | ★★★☆☆ | ★★★★☆ | **3.7** | 🔴 GemMaster + "GitHub Dungeon" already in TTRPG/playable space | |

### Why Sigil wins on multi-axis read

- **Wow:** A live demo where you type *"a guild of seafaring cartographers from a rainy archipelago"* and a few seconds later get **(a)** a formal blazon — *"Azure, a fess wavy argent between three quills or, on a chief sable a compass rose of the second"* — and **(b)** a rendered SVG coat-of-arms. That sequence is *unforgettable* in a 30-second demo clip.
- **Originality (validated against landscape):** Searched all ~110 existing submissions — **zero heraldry, zero blazon, zero coat-of-arms** entries. Closest neighbor is NexusGraph (D3 visualization), but a generated knowledge graph and a generated coat of arms look nothing alike at a glance — a judge skimming a thumbnail grid will stop on Sigil.
- **Model fit (judges' #1 criterion):** Blazon is structured, rule-bound, terse text — *exactly* what 2B/4B excel at. The intentional-model story is razor-clear: *"I needed a small model that's strong at constrained, grammar-following text and runs entirely in the user's browser. Gemma 4 2B in transformers.js is purpose-built for this — and I verified by A/B-ing against 4B."*
- **Feasibility:** No camera, no audio, no GPU. Browser + WebGPU/WASM + a hand-coded SVG composition layer. Solvable solo in 9 days.
- **Visual demo:** Heraldry is intrinsically photogenic — every output is a portfolio piece for the DEV post. The thumbnail on DEV's submission grid stands out among screenshots of chat UIs and code diffs.
- **Honest tradeoff:** Real-world utility is hobbyist-tier (worldbuilders, TTRPG players, fantasy writers, genealogy enthusiasts). That's fine — *creativity/originality* outweighs utility in the judging rubric, and the audience overlaps with DEV's reader base.

### How the DEV post avoids the saturated framings

The post **must not** lead with these crowded angles (every one of them has 5+ existing posts):

- ❌ "Zero-backend AI in the browser"
- ❌ "Local-first / privacy-first"
- ❌ "I ran Gemma 4 on $hardware"
- ❌ "Multi-agent debate"
- ❌ "Intentional model selection guide"

Instead, lead with the **domain hook**: *"I taught Gemma 4 to speak the 900-year-old language of heraldic blazon — and to draw the shields it describes."* The model-choice story belongs in paragraph 4, not paragraph 1.

## Recommended Build: **Sigil**

### One-line pitch
A browser-native tool where you describe a faction, family, or fictional kingdom in plain English, and Gemma 4 produces a **formally valid heraldic blazon** and a rendered SVG coat of arms — running entirely on-device with no install.

### Architecture (solo, 9 days)
- **Frontend:** Single-page Vite + React app. No backend.
- **Inference:** Gemma 4 **2B** via `@huggingface/transformers` (transformers.js) with WebGPU fallback to WASM. Model downloads once to the user's browser cache.
- **Pipeline:**
  1. User prompt → Gemma 4 generates a **JSON intermediate representation** (tinctures, ordinaries, charges, divisions) using constrained decoding via JSON-schema-style prompting.
  2. JSON → deterministic **blazon serializer** (hand-written, ~200 lines TS) producing canonical heraldic English.
  3. JSON → **SVG renderer** composing a fixed library of heraldic primitives (escutcheon shapes, ordinaries like fess/chevron/pale/bend, charges like lion/eagle/rose/star, divisions like party-per-pale, tincture fills with hatching for tradition).
  4. Optional "explain" pass: 4B narrates *why* the design suits the description (heraldic symbolism reasoning).
- **Intentional model choice writeup angle:** Why **2B over 4B**: the rendering pipeline does the heavy structural work; the model only needs structured-text intelligence. 2B keeps the in-browser download under ~1.5GB quantized — a real product constraint, not an academic toss-off. Mention you A/B'd against 4B and 2B was sufficient when paired with constrained decoding.

### Critical files to create (greenfield, no existing code)
- `package.json` — Vite + React + transformers.js + zod (for output validation).
- `src/model/gemma.ts` — model loader, prompt template, constrained-JSON generation loop, retry-on-invalid-JSON.
- `src/blazon/schema.ts` — zod schema for the intermediate representation (tinctures, ordinaries, charges, divisions).
- `src/blazon/serialize.ts` — IR → formal blazon English. Pure function, fully unit-testable.
- `src/render/svg.tsx` — IR → SVG. Each primitive is a small React component composing into a 400×500 escutcheon.
- `src/render/primitives/` — SVG path library: shields, ordinaries, ~30 charges, ~7 tinctures with hatching patterns.
- `src/ui/App.tsx` — prompt box, model-loading progress, side-by-side blazon text + rendered shield, "shuffle" button to regenerate, "explain symbolism" panel.
- `README.md` — project overview, model choice rationale, "how it works" diagram, run instructions.
- `DEVPOST.md` — draft of the DEV submission (project pitch, intentional-model story, screenshots, link to deployed demo).

### Reusable patterns / libraries (no code to mine yet)
- `transformers.js` Gemma 4 example for browser inference (consult Hugging Face docs via context7).
- `zod` for IR validation + retry loop on malformed JSON.
- `xstate` (optional) if the model→validate→render loop benefits from explicit state.
- Heraldic SVG references: open-licensed coats-of-arms on Wikimedia Commons as primitive design references (re-draw, don't copy).
- Heraldic blazon grammar: the [Pimbley Heraldry Dictionary](https://pimbley.com/heraldry/dictionary) or Parker's *Glossary of Heraldry* (public domain) as the rules source for serializer correctness.

### 9-Day Schedule (solo)

| Day | Goal |
|-----|------|
| 1 (May 15) | Vite scaffolding + transformers.js + Gemma 4 2B loading in browser. Hello-world generation. |
| 2 | Define IR schema (zod) + ~10 example prompts → hand-written IR pairs as eval set. |
| 3 | Prompt engineering + constrained JSON output reliably parsing into IR. |
| 4 | Blazon serializer (IR → formal English). Unit tests against ~15 canonical blazons. |
| 5 | SVG primitives library: escutcheon, 4 ordinaries, 7 tinctures with hatching. |
| 6 | SVG primitives library: ~20 charges (lion, eagle, rose, star, sword, anchor, tower, etc.) + divisions. |
| 7 | Wire UI end-to-end. Symbolism "explain" pass. Polish loading state. |
| 8 | Deploy to GitHub Pages or Vercel static. Record 3-4 demo prompt sessions for the post. |
| 9 (May 23) | Write DEV post (~500 words: pitch, model-choice story, embedded video, screenshots, repo link). Submit before May 24 EOD PDT. |

### Verification

The plan succeeds when:
1. **Live demo loads in a fresh Chromium tab in airplane mode** (after one initial model fetch). Show the airplane-mode toggle in the demo video.
2. **End-to-end determinism check:** for the same prompt + seed, IR + blazon + SVG reproduce exactly. (Constrained decoding makes this achievable; this is the rigor judges reward.)
3. **Blazon-correctness eval:** hand-grade 20 generated blazons against the Pimbley grammar — target ≥80% formally valid (the serializer guarantees validity *given* a valid IR, so the real question is IR coverage).
4. **Rendering coverage check:** every charge/ordinary referenced by the IR schema has an SVG primitive. No "missing graphic" placeholders in shipped demo.
5. **Demo recording:** capture three prompt examples (a kingdom, a guild, a personal house) showing prompt → blazon → SVG in <10 seconds each on a mid-range laptop.
6. **DEV-post checklist (per HACKATHON.md submission template):**
   - Clear intentional-model-choice paragraph (2B not 4B, with reasoning).
   - Embedded demo video (1-2 min).
   - Repo link with MIT/Apache license.
   - Screenshots of generated arms.
   - "How it works" diagram of the IR pipeline.

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Gemma 4 2B produces malformed JSON | Constrained decoding via prompt + zod validation + 3-retry loop; fallback to 4B if needed. |
| transformers.js Gemma 4 support gaps on day 1 | Spike on Day 1 specifically to confirm; if blocked, pivot to Gemma 4 4B via `ollama` + small Node bridge (loses "browser-native" pitch but ships). |
| SVG primitives take longer than 2 days | Pre-scope a minimum viable set of 12 charges; mention "extensible library" in the writeup. |
| Symbolism explanations sound generic | Cache 3 hand-curated "great" examples in the demo to showcase; explain-pass is bonus, not core. |
| Time pressure on the writeup | Draft the DEV post structure on Day 1 alongside the README — fill in as you build. |

### Backup Pick

If the Day-1 transformers.js + Gemma 4 spike fails, pivot to **Etym** (#2): same architecture, smaller surface area (no SVG primitive library — D3 tree rendering is mostly framework code), still hits originality + browser-native + unexpected-domain wow.

### Brainstorming
- Strudel REPL + Gemma for creating audios using the Strudel language and Gemma