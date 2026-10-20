/* No dependencies: node --test art/environment-art.test.cjs */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync(__dirname + '/environment-art.js', 'utf8');

function api(mockWindow) {
  const global = { window: mockWindow, globalThis: mockWindow };
  vm.runInNewContext(code, global);
  return mockWindow.AkiEnvironmentArt;
}
function scene(id, entries) {
  const draw = () => {};
  let calls = 0;
  return { id, dur: 18, draw, trans: 'fade', init(S) { calls++; S.els = entries.slice(); },
    get calls() { return calls; } };
}
function fakeCanvas() {
  const noop = () => {};
  const gradient = {addColorStop: noop};
  const props = {
    createLinearGradient: () => gradient, createRadialGradient: () => gradient,
    drawImage: noop, save: noop, restore: noop, translate: noop, scale: noop,
    transform: noop, fill: noop, stroke: noop, beginPath: noop, closePath: noop,
    moveTo: noop, lineTo: noop, bezierCurveTo: noop, quadraticCurveTo: noop,
    ellipse: noop, clip: noop, fillRect: noop, rect: noop,
  };
  const ctx = new Proxy(props, {get: (o, p) => o[p] === undefined ? noop : o[p]});
  return {width: 0, height: 0, getContext: () => ctx};
}

test('five scenes are wrapped once; unrelated scenes and draw/timing stay untouched', () => {
  const mod = api({});
  const ids = ['hokkaido', 'akihana', 'trees', 'brook', 'village', 'unrelated'];
  const scenes = ids.map(id => scene(id, [{k:'maple', p:1, x:200, y:400, s:1}]));
  const originals = scenes.map(x => ({init:x.init, draw:x.draw, dur:x.dur, trans:x.trans}));
  assert.equal(mod.install(scenes), 5);
  assert.equal(mod.install(scenes), 0);
  assert.equal(scenes[5].init, originals[5].init);
  scenes.forEach((s, i) => {
    assert.equal(s.draw, originals[i].draw);
    assert.equal(s.dur, originals[i].dur);
    assert.equal(s.trans, originals[i].trans);
    const S = {}; s.init(S);
    assert.equal(s.calls, 1);
    assert.equal(S.els[0].k, i === 5 ? 'maple' : 'fn');
  });
});
test('actor callbacks and non-art items remain exactly the same', () => {
  const mod = api({});
  const animal = () => {};
  const lantern = {k:'toro',p:.9};
  const fox = {k:'fn',p:1.001,fn:animal};
  const s = scene('akihana', [lantern, fox, {k:'fern',r:150,p:1}]);
  mod.install([s]); const S = {}; s.init(S);
  assert.equal(S.els[0], lantern);
  assert.equal(S.els[1], fox);
  assert.equal(S.els[2].k, 'fn');
});
test('village rewrites squirrel/hare/bear housing but not the animal animation callbacks', () => {
  const mod = api({});
  const squirrel = () => {};
  const hare = () => {};
  const s = scene('village', [
    {k:'fn',p:.701,fn:()=>{}}, {k:'fn',p:.702,fn:squirrel},
    {k:'fn',p:.86,fn:()=>{}}, {k:'fn',p:.87,fn:hare},
    {k:'fn',p:.86,fn:()=>{}},
  ]);
  mod.install([s]); const S = {}; s.init(S);
  assert.equal(S.els[1].fn, squirrel);
  assert.equal(S.els[3].fn, hare);
  assert.notEqual(S.els[0].fn, s.init);
  assert.notEqual(S.els[2].fn, S.els[4].fn);
});
test('brook base keeps original path creation and animated floaters', () => {
  const mod = api({});
  let baseCalls = 0;
  const original = (ctx, t) => {baseCalls++; void ctx; void t;};
  const floaters = () => {};
  const s = scene('brook', [
    {k:'fn',p:.9001,fn:original}, {k:'fn',p:.9002,fn:()=>{}},
    {k:'fn',p:.99,fn:floaters}
  ]);
  mod.install([s]); const S = {}; s.init(S);
  assert.equal(S.els[2].fn, floaters);
  const c = fakeCanvas().getContext('2d');
  S.els[0].fn(c, 4);
  assert.equal(baseCalls, 1);
});
test('all art categories paint without relying on application globals', () => {
  const mock = {document:{createElement: () => fakeCanvas()}};
  const mod = api(mock);
  const kinds = ['ridge','canopy','ground','brush','trunk','maple','birch',
    'spruce','larch','bush','rock','fern','sasa'];
  const entries = kinds.map((k,i) => ({k,x:400,y:700,p:0.9,s:i+1,h:900,
    w:k==='ground' || k==='brush' ? 3000 : 70,
    r:120,o:k==='ridge' || k==='canopy' ? {w:2900,h:900} : undefined}));
  const s=scene('trees', entries);
  mod.install([s]); const S={}; s.init(S);
  const ctx = fakeCanvas().getContext('2d');
  for (const e of S.els) assert.doesNotThrow(() => e.fn(ctx, 8));
  assert.ok(mod.getCacheStats().bytes <= 42*1048576);
  mod.clearCache();
  assert.equal(mod.getCacheStats().bytes, 0);
});
