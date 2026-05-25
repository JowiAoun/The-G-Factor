# DESIGN.md - The G Factor blog video (Bundle A)

Visual identity for the animated explainer covering Bundle A (the "Why The G
Factor" naming thesis + the system architecture). Palette and type are lifted
directly from the live app's `src/styles.css` so the blog video and the running
product read as one piece.

## Style Prompt

A red-velvet theatre after the house lights drop: deep oxblood darkness, a single
warm spotlight, gilded brass trim, marquee bulbs. The mood is "talent-show glam"
crossed with a cold competence test - showbiz glamour on the surface, precise
machinery underneath. Type carries that contradiction: an expressive high-contrast
serif for the *show*, a clean monospace for the *machine*. Motion is confident and
staged: spotlights snap on, a wordmark slams in under marquee bulbs, a red curtain
wipes between acts. Warm gold leads; signal colors (green pass, red retry) appear
only where the pipeline needs them.

## Colors

Background and surfaces (from the app's theatre tokens):
- `#120307` velvet near-black - page background (never pure #000)
- `#4a0810` burgundy - primary panel / card surface
- `#2a060a` burgundy-soft - secondary surface
- `#6e0e0e` / `#3a0404` curtain red - decorative drapes only

Accent (the one brand hue - warm gold):
- `#ffd86b` gold-bright - primary accent, spotlights, marquee bulbs, key text
- `#c9b06e` gold-muted - secondary gold, rules, borders
- `#8a6f2e` gold-deep - shadow side of brass

Text inks:
- `#f6e9c8` cream - primary text
- `#e7d6a8` parchment - secondary text
- `#a08d68` muted - tertiary labels (large sizes only; too low-contrast under ~22px)

Functional signal palette (diagram legend, used sparingly with fixed meaning):
- `#6ed98a` success green - "valid" / passes the firewall
- `#ff5a5a` danger red - "retry" / rejected
- `#ff9a3c` warning amber - caution
- `#d8748f` rose - the remote / cloud path (the one hop that leaves the device)

Glow: footlight warm `rgba(255,220,140,0.32)`; spotlight cone is a warm radial
gradient, never a full-screen linear gradient (H.264 banding).

## Typography

Two voices, crossing the serif/mono boundary (never two sans):
- **Fraunces** - the *show* voice. Display headlines and the wordmark. Push weight
  to 900 for the marquee slam, drop to 300-400 italic for elegant subheads. This is
  the app's real `--font-marquee`.
- **JetBrains Mono** - the *machine* voice. Labels, code, data, kickers, the
  psychometric column. 400 body / 500-700 emphasis. Use `tabular-nums`.

The tension is the thesis: theatrical serif (the talent show) against precise
monospace (the model doing the work). Weight contrast is extreme by design
(Fraunces 900 vs JetBrains Mono 400). Tracking -0.02 to -0.04em on display sizes.
On the dark ground, use ~350 not 400 for mono body and add a touch of line-height.

## Motion

Energy: medium (explainer). Primary transition is a blur-crossfade; the act break
(naming -> architecture) is a red velvet **curtain wipe**; the wordmark reveal is
the bold accent (scale slam + footlight flash). Outro is a slow crossfade to black.
Vary eases (at least 3 per scene): `expo.out` for confident entrances, `sine.inOut`
for drift, `back.out` for the bulbs. Build / breathe / resolve per scene; ambient
motion is a slow spotlight breathe or bulb pulse (finite repeats, never repeat:-1).

## What NOT to Do

- No cyan-on-dark, no purple-to-blue gradients, no neon - this is warm gold theatre,
  not a generic tech deck (the earlier draw.io diagrams ran cool; the video is warm).
- No Inter / Roboto / Poppins / Syne (the app uses Inter, but the video does not).
- No full-screen linear gradients on the velvet (banding) - radial glow + solid only.
- No pure `#000` or `#fff` - tint toward oxblood / cream.
- No centered-and-floating single text block - anchor to edges, two focal points min.
- No element pops in fully formed - everything has an entrance; the transition is the exit.
