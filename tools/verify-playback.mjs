// Dependency-free checks for the single-file Canvas presentation.
// These are structural checks, not a replacement for a browser performance test.
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const embedded = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(embedded, 'An inline director script must exist');
const js = embedded[1];

test('the presentation JavaScript parses', () => {
  assert.doesNotThrow(() => new Script(js, { filename: 'index.html' }));
});

test('auto/music/nature buttons are reachable from the UI', () => {
  for (const id of ['btnAutostart', 'btnAuto', 'btnMusic', 'btnAmb']) {
    assert.match(html, new RegExp('id="' + id + '"'));
    assert.match(js, new RegExp("getElementById\\('" + id + "'\\)\\.addEventListener"));
  }
  assert.match(js, /function syncControls\(\)/);
  assert.match(js, /setAttribute\('aria-pressed'/);
});

test('audio paths do not silence nature when music is muted', () => {
  assert.match(js, /music\.connect\(musicBus\)/);
  assert.match(js, /musicBus\.connect\(rev\)/);
  assert.match(js, /amb\.connect\(master\)/);
  assert.match(js, /toggleMusic\(\)/);
  assert.match(js, /toggleAmbience\(\)/);
});

test('low-tier rendering avoids costly full-frame filters', () => {
  assert.match(js, /if \(TIER < 2 \|\| DBG\.on\)/);
  assert.match(js, /if \(TIER >= 2 && !DBG\.on\) return/);
  assert.match(js, /if \(FILTER_OK && TIER < 2\)/);
  assert.match(js, /trans\.fromReady = true/);
});

test('auto-play reaches the next scene and respects the last scene', () => {
  assert.match(js, /auto && !trans && cur && idx < SCENES\.length - 1/);
  assert.match(js, /cur\.t >= duration \+ 12/);
  assert.match(js, /setAuto\(!auto\)/);
});
