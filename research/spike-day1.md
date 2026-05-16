# Day-1 Spike — pending verdict

> **Plan:** [STRUDEL_PLAN.md Phase 0](../STRUDEL_PLAN.md) · **Tracker:** [TODO.md](../TODO.md)
> **Date started:** 2026-05-16
> **Model:** `onnx-community/gemma-4-E2B-it-ONNX` (Gemma 4 effective-2B, q4)
> **Inference path:** browser via `@huggingface/transformers` (WebGPU primary, WASM fallback)

> Path note: the original plan placed this artifact under `.omc/research/`, but that directory is gitignored. The tracked decision-of-record now lives here at `research/spike-day1.md`.

## Listening protocol

1. Dev server: `pnpm dev` → open `http://localhost:5173/` in a WebGPU-capable browser (Chrome 113+, Edge, recent Firefox).
2. Click **Load Gemma 4 E2B** — first run downloads ~1.5 GB; subsequent runs hit cache.
3. When status shows `ready`, click **Run spike**. The 15 outputs stream in (5 seeds × 3 variations).
4. For each row: click ▶ to play, listen, click **Y** if it sounds *musically interesting* (not just "not broken"), **N** if it sounds boring, broken, or harmonically/rhythmically lifeless. Leave unmarked if you can't decide — counts as "not interesting" in the verdict.
5. When all 15 are scored, click **⬇ Export JSON** and save into this directory as `spike-results.json`.
6. Append the listening notes section below, then write the verdict.

## Gate

| Parse rate | Interesting rate | Verdict |
|---|---|---|
| ≥10/15 | ≥8/15 | **PASS** — continue Phase 1 on Gemma 4 E2B |
| ≥10/15 | 6–9/15 | **MARGINAL** — escalate to Gemma 4 E4B, re-spike |
| <10/15 or interesting ≤5/15 | — | **FAIL** — pivot to Sigil (PLAN.md) |

## Results

_Pending — fill in after the spike runs._

### Tally
- Parsed:        __ / 15
- Interesting:   __ / 15
- Cold-load:     ___ s
- Device:        webgpu | wasm

### Listening notes
_(Free-text — short impression per seed family.)_

- Minimal kick (`s("bd*4")`):
- Kick+hat groove (`s("bd hh sd hh")`):
- Melodic synth loop (`note("c e g c5").s("sawtooth").slow(2)`):
- Polyrhythm (`s("bd(3,8), hh(5,8)")`):
- Ambient pad (`note("<c eb g bb>*2").s("sawtooth").slow(4).room(0.5)`):

### Verdict
**Status:** _PENDING_

Decision: ___

## Raw export
_Drop the contents of `spike-results.json` here once exported, or commit the file alongside this one._
