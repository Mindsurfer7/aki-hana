#!/usr/bin/env node
/** No browser/deps: verify scene isolation, painter execution and rollback. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
const script = readFileSync(new URL('./finale-art.js', import.meta.url), 'utf8');
const box = { window: {} };
runInNewContext(script, box, { filename: fileURLToPath(new URL('./finale-art.js', import.meta.url)) });
const ids = box.window.AkiFinaleArt.scenes;
assert.deepEqual([...ids], ['memory', 'hope', 'friends', 'together', 'done', 'night']);

const counts = {};
const defs = ['watch', ...ids, 'akihana'].map(id => ({
  id,
  init(S) {
    S.els = [0.95, 1.0001, 1.0005, 1.001].map(p => ({ k: 'fn', p, fn() { counts[id + '.element'] = (counts[id + '.element'] || 0) + 1; } }));
  },
  draw() { counts[id + '.draw'] = (counts[id + '.draw'] || 0) + 1; },
}));
const unchanged = [defs[0].init, defs[0].draw, defs.at(-1).init, defs.at(-1).draw];
let paintCalls = 0;
const gradient = { addColorStop() {} };
const context = new Proxy({
  globalAlpha: 1,
  createLinearGradient() { paintCalls++; return gradient; },
  createRadialGradient() { paintCalls++; return gradient; },
}, {
  get(target, key) {
    return key in target ? target[key] : () => { paintCalls++; };
  },
});
const ctrl = box.window.AkiFinaleArt.install({
  scenes: defs,
  hooks: {
    L: (ctx, cam, depth, cb) => cb(ctx),
    camAt: () => ({}),
    rng: () => ({ r: min => min }),
  },
});
assert.equal(ctrl, box.window.AkiFinaleArt.install({ scenes: defs }), 'install must be idempotent');
assert.equal(defs[0].init, unchanged[0]);
assert.equal(defs[0].draw, unchanged[1]);
assert.equal(defs.at(-1).init, unchanged[2]);
assert.equal(defs.at(-1).draw, unchanged[3]);
for (const def of defs) {
  const S = {}; def.init(S);
  for (const t of [4, 9, 21]) {
    for (const element of S.els) element.fn(context, t);
    def.draw(context, t, S, 0.016);
  }
}
assert.ok(paintCalls > 0, 'artwork should draw on the supplied Canvas2D context');
const painted = paintCalls;
ctrl.setEnabled(false);
for (const def of defs) {
  const S = {}; def.init(S);
  for (const e of S.els) e.fn(context, 9);
  def.draw(context, 9, S, 0.016);
}
assert.equal(paintCalls, painted, 'legacy mode must not issue extra draw calls');
ctrl.uninstall();
assert.equal(defs[1].draw.name, 'draw');
assert.equal(defs[1].init.name, 'init');
assert.equal(counts['watch.draw'], 4);
assert.equal(counts['akihana.draw'], 4);
console.log('Finale art smoke: 6 scene painters, legacy rollback and scene isolation OK');
