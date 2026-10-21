// Self-contained regression tests for team C's isolated art layer.
// Run: node --test tools/verify-emotional-art.mjs
import { readFileSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../art/emotional-art.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ids = ['decide', 'wind', 'offer', 'tired', 'bearcomes', 'talk'];

function installFixture() {
  const calls = [];
  const globals = { creature(_ctx, kind, pose, x, y, sc, o) {
    calls.push({ kind, pose, x, y, sc, o });
  }};
  const originalCreature = globals.creature;
  const initialPose = Object.freeze({ mode: 'sit', t: 8, eye: 0.02, sad: 0.9, seed: 2 });
  const scenes = ['doubt', ...ids, 'friends'].map(id => ({
    id,
    draw() { globals.creature(null, id === 'offer' ? 'hare' : 'fox', initialPose, 1100, 800, 2, { face: -1 }); }
  }));
  const before = new Map(scenes.map(s => [s.id, s.draw]));
  runInNewContext(source, { window: globals, SCENES: scenes, console, Math, WeakSet, Set, Object, Array, TypeError });
  return { globals, scenes, before, calls, initialPose, originalCreature };
}

test('art layer parses as classic script and the six scenes exist in the director', () => {
  assert.doesNotThrow(() => new Script(source));
  for (const id of ids) assert.match(html, new RegExp("id: '" + id + "'"));
});

test('only the six owned scenes are decorated, and install is idempotent', () => {
  const { scenes, before, globals } = installFixture();
  assert.deepEqual([...globals.AkiEmotionalArt.ownedScenes], ids);
  assert.equal(globals.AkiEmotionalArt.install(scenes), 0);
  for (const s of scenes) {
    assert.equal(s.draw === before.get(s.id), !ids.includes(s.id), s.id);
  }
});

test('original render receives a new pose; caller pose and positions are unchanged', () => {
  const { scenes, globals, calls, initialPose, originalCreature } = installFixture();
  for (const s of scenes) {
    s.draw({}, 8, {}, 1 / 30);
    assert.strictEqual(globals.creature, originalCreature, 'shared renderer restored for ' + s.id);
  }
  assert.equal(calls.length, scenes.length);
  for (const item of calls) {
    assert.strictEqual(item.pose, initialPose, 'pose preserved on unowned scene');
    assert.equal(item.x, 1100);
    assert.equal(item.y, 800);
    assert.equal(item.sc, 2);
    break;
  }
  const tired = calls[ids.indexOf('tired') + 1];
  assert.notStrictEqual(tired.pose, initialPose);
  assert.equal(tired.pose.eye, 0.2);
  assert.equal(tired.pose.sad, 0.65);
  assert.equal(initialPose.eye, 0.02);
});

test('render exceptions restore the original creature renderer', () => {
  const { globals, scenes, originalCreature } = installFixture();
  scenes.find(s => s.id === 'wind').draw = (() => { throw new Error('draw fault'); });
  const custom = [{ id: 'wind', draw() { throw new Error('draw fault'); } }];
  globals.AkiEmotionalArt.install(custom);
  assert.throws(() => custom[0].draw({}, 3.5, {}, 0.016), /draw fault/);
  assert.strictEqual(globals.creature, originalCreature);
});

test('art layer has no side-effect interfaces for audio, camera or timing', () => {
  const exposed = Object.keys(installFixture().globals.AkiEmotionalArt).sort();
  assert.deepEqual(exposed, ['expression', 'install', 'light', 'ownedScenes']);
});
