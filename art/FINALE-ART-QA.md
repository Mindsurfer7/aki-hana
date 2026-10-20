# Aki Hana · Team D — Finale Art (scenes 17–22)

Branch: feat/aki-art-finale-17-22 · PR target: main.

## Scope and compatibility

- Painter: [finale-art.js](finale-art.js). It only wraps the six named scene definitions in the supplied SCENES array; no shared drawing functions, camera keyframes, scene transitions, timings, text, voice, sounds, HUD, or other scene definitions are rewritten.
- Original scene poses are evaluated as before. Additional Canvas 2D detail is composited at the **same parallax depth and same construction phase** via each scene's existing S.els callback. Per-scene atmosphere is layered after original scene rendering.
- Browser rendering uses gradients, paths and ellipses, not filter/blur loops or new sprite atlases.
- The module is deliberately **not loaded by index.html**: changing that file belongs to a later integrator, not to parallel scene teams.
- AkiFinaleArt.install returns an API with enabled, setEnabled(boolean), and uninstall(). The false state restores the legacy drawing result, and uninstall() restores original init/draw definitions. Recreate instances after uninstall.

## Integration contract for the final integrator (NOT applied in this PR)

The current repository is monolithic: one classic inline script in index.html defines SCENES, helpers and the main loop. Loading a standalone JS file without calling it does not alter the main show. Do not assume it has been integrated.

1. Load art/finale-art.js as a classic script before the main inline JS script (no module type).
2. After all six scene definitions have been registered, but **before** the first makeInst()/boot() invocation, insert the integration call:

~~~js
const finaleArt = window.AkiFinaleArt.install({
  scenes: SCENES,
  hooks: { L, camAt, rng },
  enabled: true
});
// Feature-flag rollback: finaleArt.setEnabled(false).
~~~

3. Validate initial start, #sNNtTf, autoplay and transitions. Other art-team modules should scope their changes by scene IDs, too.
4. Do not move the hook into any draw() method: install once, not once per frame.

For smoke-testing **without modifying the main page**, open [finale-preview.html](finale-preview.html) at an HTTP origin. Its iframe adapter installs the art separately on the right while the left iframe remains untouched.

## Before / after capture matrix

Serve the repository root with the command below and open http://localhost:8000/art/finale-preview.html. Select a scene and moment. The button “Сохранить before / after (PNG)” exports both native Canvas frames at the same timecode.

| # | Scene | Recommended frames | Visual changes |
|---|---|---|---|
| 17 | memory | 8 s | Watercolour recollection, warmer timber/ridge and gentle cabin light |
| 18 | hope | 9 s | Softening, brighter amber opening around the characters |
| 19 | friends | 8 s | Consistent character grounding and light temperature |
| 20 | together | 4, 11, **21 s** | Progressive logs / roof shingles, windows, flowers, wood curls and grip highlights |
| 21 | done | **11 s** | Finished storybook cottage, twin luminous windows, details and flower garden |
| 22 | night | 2, **11**, 19 s | Moonlit blue depth, warmer windows, gentle light falloff |

The chosen times exercise reveal chronology, night camera lift and construction continuity. Avoid judging the 20th scene only from a finished-house still: the 4s, 11s and 21s samples are all important.

### Automated capture + fallback regression

[capture-finale.mjs](capture-finale.mjs) uses optional Playwright to export 10 before/after pairs to the untracked art/before-after/ directory and record pixel differences. It toggles art off and checks that the original renderer stays visually close (allowing for independent grain/flicker seeds).

~~~sh
python3 -m http.server 8000
# In another terminal:
npm install --no-save playwright
npx playwright install chromium
node art/capture-finale.mjs
~~~

Manual review remains necessary: numerical RGB difference does not prove composition quality. Compare especially the cub's hand/hammer intersection and moonlit village at 19 seconds.

## Known animation observations (outside Team D's edit rights)

- In scene together, drawBuilders() animates the bear's arm and mallet via hammerStroke() while the cottage's roof reveals on a separate timeline. The wrist/item remain connected (small highlights now match calculated grip coordinates), but apparent roof contact or strike timing may not align across all camera zooms. **Not changed**: actual contact would require a dedicated animation/kinematics PR.
- Scene memory uses the existing squirrel roof path and bear pose. No changes to foot contact, jump or arm trajectories.
- Night crane, parallax and luminous-village timing are inherited, not retimed. Distant windows remain abstract points of light.

These are review items, not a claim that animation defects have been reproduced by a live browser run in this environment.

## Acceptance checklist

- [ ] Six pairs visually inspected for warm, coherent character scale and palette
- [ ] Scene 20 at 4 / 11 / 21s: building materials reveal progressively and grip remains attached
- [ ] Scene 21 facade: shingles, twin windows and plants do not cover the fox or title
- [ ] Scene 22 at 2 / 11 / 19s: no severe black crush or detached window glow while the camera moves
- [ ] Toggle original art off/on and compare layout and audio/transition continuity
- [ ] Open in q=low and mobile to check budget and effective size
- [ ] Integrator separately wires module into production without conflicts with Teams A–C

No original screenshots are checked into the branch. The capture harness creates them reproducibly, but actual visual acceptance needs a served repository and Playwright-capable browser.
