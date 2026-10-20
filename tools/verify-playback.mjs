// Dependency-free checks for the single-file Canvas presentation.
// Structural checks and syntax tests. Runtime audio should also be tested
// in Safari and in-app browsers on real devices.
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

test('playback buttons have handlers', () => {
  for (const id of ['btnAutostart', 'btnAuto', 'btnMusic', 'btnAmb', 'btnEnableAudio']) {
    assert.match(html, new RegExp('id="' + id + '"'));
    assert.match(js, new RegExp("getElementById\\('" + id + "'\\)\\.addEventListener"));
  }
  assert.match(js, /function syncControls\(\)/);
  assert.match(js, /setAttribute\('aria-pressed'/);
});

test('the voice channel uses unlocked WebAudio, not delayed media autoplay', () => {
  assert.match(js, /ac\.resume\(\)/);
  assert.match(js, /const ctx = AUDIO\.context/);
  assert.match(js, /ctx\.decodeAudioData\(await response\.arrayBuffer\(\)\)/);
  assert.match(js, /ctx\.createBufferSource\(\)/);
  assert.match(js, /window\.AKI_HANA_VOICE\?\.\[key\]/);
  assert.doesNotMatch(js, /new Audio\(/);
  assert.match(js, /AUDIO\.start\(\);\s*if \(full\) toggleFull\(\)/);
  assert.match(js, /audioNotice/);
});

test('music, ambience and voices have independent volume paths', () => {
  assert.match(js, /music\.connect\(musicBus\)/);
  assert.match(js, /rg\.connect\(musicBus\)/);
  assert.match(js, /amb\.connect\(natureBus\)/);
  assert.match(js, /gainNode\.connect\(ctx\.destination\)/);
  assert.match(js, /toggleMusic\(\)/);
  assert.match(js, /toggleAmbience\(\)/);
});

test('low-tier rendering avoids costly full-frame filters', () => {
  assert.match(js, /if \(TIER < 2 \|\| DBG\.on\)/);
  assert.match(js, /if \(TIER >= 2 && !DBG\.on\) return/);
  assert.match(js, /if \(FILTER_OK && TIER < 2\)/);
  assert.match(js, /trans\.fromReady = true/);
});

test('auto-play waits for narration and respects the last scene', () => {
  assert.match(js, /auto && !trans && cur && idx < SCENES\.length - 1/);
  assert.match(js, /elapsed >= duration \+ 12/);
  assert.match(js, /now - endedAt >= 650/);
  assert.match(js, /setAuto\(!auto\)/);
});
