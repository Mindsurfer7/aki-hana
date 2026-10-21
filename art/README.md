# Environment Art — Team A (scenes 01–05)

Branch: `feat/aki-art-environment-01-05` · target: `main`.

## Decision: local Canvas painter, not PNG/SVG assets

The film is a single inline Canvas2D program in `index.html`: 1920×1080
logical coordinates, scene-local `S.els` element lists, `world()` depth
sorting and `L()` for animated camera/parallax. Animated animals and props
already exist as `k:'fn'` entries.

This module **wraps only the five scene `init` functions**, idempotently.
It replaces environment primitives at exactly the same depth and coordinates
with local `k:'fn'` painters. No shared global painter changes. Camera keys,
scene timing, motion of characters, transitions, sound, voice, control logic,
and all scene text remain untouched. Scene 6 onwards is never wrapped.

Shapes use smooth Canvas curves and soft gradients instead of stippled leaves
or rough per-pixel noise. Static paintings are cached in bounded offscreen
canvases (1440px maximum cache dimension; 42 MiB LRU cap). No network calls,
external assets, image scaling artifacts or runtime dependencies are added.

### Scene changes

| Scene | Illustration |
| --- | --- |
| `hokkaido` | Soft ridges, layered autumn woodland and airy morning atmosphere |
| `akihana` | Warm rounded maples, pale shirakaba birches, soft moss, low-noise undergrowth; fox untouched |
| `trees` | Tall curved trunks, legible crowns, golden overhead foliage; original camera tilt untouched |
| `brook` | Jade water gradient, broad gentle glints, pastel mossy stones and banks; original brook path, reflections and floating leaves retained |
| `village` | Rounded thatched hare house, cozy cedar bear house, friendly squirrel hollow, warm windows and moss; animals and smoke untouched |

The forest remains recognisably Hokkaido: birches, maples, spruce/larch,
sasa, ferns, Japanese stone lantern, thatched roof references.

## Integrator: opt in with two small changes to index.html

**This branch does not edit `index.html`.** After landing the PR, the
integrator adds the following, immediately before the existing inline
`<script>` that starts with `'use strict';` and `const W = 1920`:

    <script src="art/environment-art.js"></script>

Then *inside* the existing inline script, **after all 22 scene definitions
and before the final `resize(); HUD.build(); syncControls();` boot sequence**:

    AkiEnvironmentArt.install(SCENES);

The file is a classic script exposing `window.AkiEnvironmentArt`, not an
ES module. The call must precede the first `makeInst()`; simply loading
the external script does not enable the changes.

**Rollback:** remove those two lines. No persistent data or production assets
are affected. Repeated installation is a no-op. Optional
`AkiEnvironmentArt.clearCache()` releases local sprite canvases.

## Before/after for all 5 scenes

Run from repository root:

    python3 -m http.server 8000

Then open `http://localhost:8000/art/compare.html` and click
«Сформировать все 5 пар».

The standalone comparison page uses the **unchanged** `index.html`,
captures a frozen source Canvas, injects the art module into an isolated
same-origin iframe, re-initializes the scene at the **same timestamp**, and
captures the new Canvas. It creates **ten side-by-side images** with individual
PNG links. The page itself does *not* persist screenshots to the repository.

Snapshots: `hokkaido` t=9s; `akihana` t=8s;
`trees` t=8s; `brook` t=8s; `village` t=8s.

Each pair has a sample text strip for readability and cold/warm frame cost
diagnostics. Production chapter/caption overlays are independent DOM layers,
so review them in the running film as well.

## QA / review checklist

- [ ] Generate 5 original/new pairs and compare composition, color balance and visual hierarchy.
- [ ] Check title readability on scene 1 and subtitle contrast on scenes 2–5 in the real film UI.
- [ ] Check fox, squirrel and hare silhouettes do not visually merge with the warm backgrounds.
- [ ] Check both village houses and squirrel hollow throughout the camera pan.
- [ ] Check brook path, bank overlap, and mirror/reflection alignment during movement.
- [ ] Inspect actual mobile and weak desktop, including `?q=low` and `?q=ultra`.
- [ ] Compare many warm frames and the 1→2→3→4→5→6 transitions; one timing sample is not a benchmark.
- [ ] Confirm later scenes 6–22, music and sound controls are unchanged.

## Automated tests

Run (no dependencies):

    node --test art/environment-art.test.cjs

Tests cover exactly five wrapped definitions, idempotent install, unchanged
metadata and actor callbacks, brook-path initialization, drawing of all art
categories with a minimal Canvas stub and cache size limits.

## Known limitations

This PR does not edit the integration entry point. The new look will not
appear in the production film until the integrator adds the two opt-in lines.
Browser-executed PNG captures and actual device performance require running
the comparison page on a browser; they are not pre-generated binary artifacts.

The original light shafts, atmospheric washes, grading, smoke and floating
leaves remain in the pipeline, so they continue to tint the new artwork.
Shared house painters used by later scenes are deliberately unchanged.
The cache's 1440px maximum extent trades extreme zoom sharpness for more
predictable low-end-device memory and frame cost.
