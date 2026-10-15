# DESIGN.md — "Phía Sau Sân Cỏ" comparison template

**Concept angle:** A fast-paced football showdown & backstage myth-busting — two entities face off in a top-frame
split (stadium turf background, chalk line borders), high-contrast yellow & red card-accented captions call the
verdict line by line, and a host physically points the answer home. Motion reads as a thrilling football match debate.

## Colors (Football Stadium & Penalty Cards DNA)

| Token             | Value     | Use                                                            |
| ----------------- | --------- | --------------------------------------------------------------- |
| `--bg`            | `#081C15` | Root background (deep midnight stadium pitch - xanh rêu đen sâu) |
| `--panel`         | `#0F2D22` | Card surface (dark grass panel - thảm cỏ đêm tối)               |
| `--panel-edge`    | `#EBF8F2` | Card border & lines (chalk line white - vạch vôi kẻ sân)        |
| `--fg`            | `#FFFFFF` | Primary text (crisp white - chữ trắng sắc nét)                  |
| `--fg-dim`        | `#7FA896` | Secondary / inactive text (chalk dust green - xanh phấn mờ)     |
| `--accent-yellow` | `#FFD200` | Yellow card: topic names, VS badge, concept identity            |
| `--accent-red`    | `#FF334B` | Red card: keyword highlight — the "difference" word, verdict   |
| `--accent-cyan`   | `#FFD200` | Legacy alias -> `--accent-yellow`                              |
| `--accent-pink`   | `#FF334B` | Legacy alias -> `--accent-red`                                 |

Deep midnight pitch background: football/sports content stays clean, immersive, and legible.
The crisp chalk-white lines structure the cards, while the yellow and red penalty card accents provide
immediate, intuitive visual cues: Yellow represents concept identity and matchups, while Red delivers
the high-stakes verdict and decisive differences.

## Typography

- **Be Vietnam Pro, 900** — captions, topic names, VS badge. Geometric sans, heavy weight only
  (extreme weight contrast per house style), not on the banned-monoculture list. Replaces
  Montserrat: the compiler's pre-bundled embed for Montserrat only covers the "latin" unicode
  range, which drops Vietnamese tone-mark glyphs (U+1EA0-1EF9) and renders diacritics broken.
  Be Vietnam Pro is purpose-built for Vietnamese and must be embedded via explicit `@font-face`
  + `unicode-range` (vietnamese + latin subsets) in `<head>` — **not** a Google Fonts `<link>`
  (trips the `google_fonts_import` lint warning) and **not** left as a bare `font-family` name
  (silently falls back to the incomplete pre-bundled embed). See either video's `index.html`
  `<head>` for the exact `@font-face` block to copy.
- **JetBrains Mono, 700** — eyebrow tag (`#eyebrow`, text sourced from `CHANNEL` in the
  repo-root `.env` — see the `create-video` skill's `scripts/sync-channel.mjs`; default
  "SO SÁNH KIẾN THỨC"), small labels. Crosses the
  sans→mono boundary against Be Vietnam Pro (never pair two sans-serifs). Same embedding rule
  applies — JetBrains Mono also needs its "vietnamese" subset explicitly `@font-face`-embedded
  when it renders Vietnamese text (e.g. the eyebrow tag).
- Caption line size: 64px (well above the 20px in-feed floor — this is a 9:16 in-feed video).
  Topic name in cards: 44px. Eyebrow tag: 22px, uppercase, tracked +0.12em.

## Layout (1080×1920)

Three fixed horizontal zones — this split is the template's contract; only content inside
each zone changes between topics. All zone content is horizontally centered on the **canvas
center** (x=540) with symmetric left/right padding — see Safe zone below.

- **Top — comparison zone** (`y 64–824`, 760px): two image cards, 400×680 each, 40px gap,
  card-left at x=120, card-right at x=560 (right edge 960, symmetric 120px margins). A round
  VS badge (110px, left=485) sits centered on the seam, overlapping each card ~35px so it
  reads as attached, not floating.
- **Middle — caption zone** (`y 840–1300`, 460px): one caption line visible at a time,
  centered, max-width 860px, left=110 (symmetric 110px margins). Keyword spans get
  `--accent-pink`.
- **Bottom — avatar zone** (`y 1280–1920`, 640px): a flat CSS/SVG 2D robot host character
  (`#avatar-host` top=1280, left=330, horizontally centered like every other zone) — rounded-rect
  head with a glowing antenna tip, an LED-style visor with two square eyes, a speaker-bar mouth,
  rectangular mechanical arms, and a glowing chest light on the torso. Arms swap rotation per
  beat (point-left / point-right / shrug / explain / neutral-hold). Top raised from the original
  y=1360 so the head/face clears the platform caption/username band — see Safe zone.

## Safe zone (platform UI overlays)

TikTok/Reels/FB in-feed chrome overlays the raw 1080×1920 frame: an engagement-icon rail near
the right edge and a caption/username/progress-bar band at the bottom. Fix this with symmetric
padding and vertical clearance, not by shifting the composition's horizontal center — an
off-center layout reads as broken on any device/platform that *doesn't* show that overlay.

| Constant        | Value  | Meaning                                                          |
| ---------------- | ------ | ------------------------------------------------------------------ |
| `SAFE_MARGIN`     | 120px  | Minimum clearance from both the left and right edge (symmetric)    |
| `SAFE_BOTTOM`     | 380px  | Clearance from the bottom edge (caption/username/progress band)    |
| horizontal center | 540    | Raw canvas center — every zone stays centered here                 |

Only the avatar's head/upper body must clear `SAFE_BOTTOM` (y ≥ 1540 is unsafe) — the lower
torso/hands may bleed under the platform band since they carry no readable information. Card
icon internals that use fixed pixel offsets (not `%`/`translateX(-50%)` centering) must be
re-checked for overflow whenever card width changes; icons built via grid `place-items:center`
with no `top`/`left` adapt automatically.

## Background layer

- Soft `--accent-yellow` radial glow behind the VS badge, low opacity, gentle breathing pulse
  (finite repeat).
- Ghost eyebrow word ("PHÍA SAU SÂN CỎ") oversized at 4% opacity behind the caption zone, static.
- Soft stadium green glow behind the avatar's head, gentle breathing pulse, phase-opposed
  to the top glow (per `sine-wave-loop` phase-opposition rule).

## Motion

- **Image cards**: `spring-pop-entrance` (scale 0→1, `power3.out`, ~0.5s), staggered ~0.15s
  left-then-right. VS badge pops ~0.3s after on `spring-pop-entrance` (small hero pop).
- **Caption lines**: one line visible per beat window; each enters with `spring-pop-entrance`
  (y:24→0 + fade, `power3.out`, 0.35s) and exits with a fast fade+lift
  (`power2.in`, 0.2s) before the next line pops. Keyword spans get a quick color-set +
  scale-punch (1→1.15→1, 0.25s) timed to the line's entrance — a simplified,
  line-level cousin of `asr-keyword-glow` (no continuous per-word envelope; this is a
  30-40s fast-cut format, not a lyric-video read).
- **Avatar arms**: discrete rotation tweens per beat, `power3.out`, ~0.3s — point-left,
  point-right, shrug (both arms up+out), explain (one arm lower, open palm), neutral
  (arms at rest) for the outro hold.
- **Active-side emphasis**: during Giải A / Giải B, the inactive card dims to 55% opacity +
  scales to 0.96; the active card stays at full opacity/scale — directs the eye without a
  camera move (`camera-static` — the split symmetry is the subject early, but attention
  shifts once the verdict starts).

## Rhythm

Target total: **30–40s** per video (raised from the original 15-20s demo — more room per
concept). Timing is VO-driven (real TTS clip durations, not fixed beat-seconds — see the
`create-video` skill's timing-gap formula), but the beat *order* and *line budget* are fixed:

`hook(2 dòng) → question(1 dòng) → reveal-A(3 dòng) → reveal-B(3 dòng) → so-sánh-trực-tiếp(2 dòng) → payoff-hold(1 dòng)`
≈ 12 dòng thoại. `reveal-A`/`reveal-B` each grew from 2 lines to 3 (definition, key trait, one
concrete example/analogy per side) and a new side-by-side contrast beat (`so-sánh-trực-tiếp`)
sits right before the verdict — that's where the extra 15-20s of runtime goes, not into slower
pacing. Energy: punchy open, a beat of pause at the question, two deeper reveal holds, a settled
payoff dwell (≥1s per the climax-dwell rule). If the natural total falls short of 30s, add
another sentence or example line — never stretch inter-line gaps to pad time (that breaks the
fast-cut house style). No shader transitions — this is one continuous scene, not scene cuts;
all beats are internal phase changes on one timeline.

## Do's and don'ts

- Do keep the 3-zone layout byte-for-byte identical across topics — only text, image
  content, and the two card images change when this becomes a real template instance.
- Do keep keyword-red reserved for the *difference*, and yellow for the topic names / VS badge — the penalty card color coding itself teaches the viewer where to look.
- Do keep every zone's content within the safe zone (above) — centered on x=540 with symmetric
  `SAFE_MARGIN` on both sides, avatar head clear of `SAFE_BOTTOM`.
- Don't add a 4th zone or reorder the three zones — the format's recognizability depends on
  the fixed vertical stacking (top comparison → middle caption → bottom avatar). Raising the
  avatar zone's top offset to respect `SAFE_BOTTOM` is a safe-zone fit, not a reorder.
- Don't animate more than one caption line at a time — line-by-line, never word-by-word
  (this is a fast format, not a karaoke lyric video).
