/* node --test tests/character-art.test.cjs */
'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const art = require('../art/character-art.js');

function canvasMock() {
  const calls = []; let depth = 0;
  const c = {
    globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, calls,
    get depth() { return depth; },
    save() { depth++; calls.push(['save']); },
    restore() { assert.ok(depth > 0, 'restore without save'); depth--; calls.push(['restore']); },
    translate(x,y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); calls.push(['translate',x,y]); },
    scale(x,y) { assert.ok(Number.isFinite(x) && Number.isFinite(y)); calls.push(['scale',x,y]); },
    rotate(a) { assert.ok(Number.isFinite(a)); calls.push(['rotate',a]); },
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {},
    fill() { calls.push(['fill']); }, stroke() { calls.push(['stroke']); },
    quadraticCurveTo() {},
    ellipse(x,y,rx,ry,r) {
      assert.ok([x,y,rx,ry,r].every(Number.isFinite)); assert.ok(rx>0 && ry>0);
    },
    arc(x,y,r) { assert.ok([x,y,r].every(Number.isFinite)); },
    roundRect(x,y,w,h,r) { assert.ok([x,y,w,h,r].every(Number.isFinite)); },
    createLinearGradient() { return {addColorStop(k,color) {
      assert.ok(Number.isFinite(k)); assert.equal(typeof color,'string');
    }}; },
    createRadialGradient() { return {addColorStop(k,color) {
      assert.ok(Number.isFinite(k)); assert.equal(typeof color,'string');
    }}; }
  };
  return c;
}

test('allowlist, default-off and legacy fallback are reversible', () => {
  art.setEnabled(false);
  let scene='watch'; const calls=[];
  const adapter=art.createAdapter((...args)=>{calls.push(args);return 71;},()=>scene);
  const c=canvasMock();
  assert.equal(adapter(c,'fox',{mode:'back',t:5},400,600,3.2),71);
  art.setEnabled(true);
  assert.equal(art.shouldRender('watch'),true);
  assert.equal(art.shouldRender('brook'),false);
  assert.equal(adapter(c,'fox',{mode:'back',t:5},400,600,3.2),undefined);
  scene='brook'; assert.equal(adapter(c,'fox',{},0,0,1),71);
  scene='bear'; assert.equal(adapter(c,'owl',{},0,0,1),71);
  art.setEnabled(false); assert.equal(adapter(c,'bear',{},0,0,1),71);
  assert.equal(calls.length,4); assert.equal(c.depth,0);
});

test('all species paint valid anatomy through their modes and dynamic poses', () => {
  const modes={fox:['sit','back','stand','lie'],hare:['up','sit'],
    squirrel:['up','run'],bear:['sit','up','walk']};
  for(const [kind,list] of Object.entries(modes)) for(const mode of list)
    for(const time of [0,0.1,2.4,5.3,11]){
      const c=canvasMock();
      const p={mode,t:time,arm:[0.3,1.1],head:0.2,look:0.5,
        ear:0.25,sad:0.7,run:time*11,seed:7,tailFlick:1};
      assert.equal(art.drawCreature(c,kind,p,300,500,1.9,
        {face:-1,rot:-0.2,alpha:0.7}),true);
      assert.equal(c.depth,0,kind+'/'+mode+'/'+time+' leaks Canvas state');
      assert.ok(c.calls.some(v=>v[0]==='fill'));
    }
});

test('item callback is painted at wrist and art props retain Canvas state', () => {
  for(const kind of ['hare','squirrel','bear']){
    const c=canvasMock(); let held=false;
    const pose={mode:'up',t:4,arm:[0.5,0.9],item(ctx){
      held=true;ctx.beginPath();ctx.moveTo(-2,-20);ctx.lineTo(0,0);ctx.stroke();
    }};
    art.drawCreature(c,kind,pose,100,300,1);
    assert.equal(held,true,kind+' missing held item');
    assert.ok(c.calls.filter(v=>v[0]==='translate').length>=2);
    assert.equal(c.depth,0);
  }
  const c=canvasMock();
  for(const factory of [art.items.mallet(0.5),art.items.walnut(),art.items.stick(44,0.2)])factory(c);
  art.props.stool(c,0.3,4);
  art.props.basket(c,0,0,1.5,9);
  art.props.toolRack(c);
  assert.equal(c.depth,0);
});

test('invalid coordinates and unknown kinds do not draw',()=>{
  const c=canvasMock();
  assert.equal(art.drawCreature(c,'owl',{},0,0,1),false);
  assert.equal(art.drawCreature(c,'bear',{},NaN,0,1),false);
  assert.equal(art.drawCreature(c,'fox',{},0,0,0),false);
  assert.equal(c.calls.length,0);
  assert.throws(()=>art.createAdapter(null,()=> 'bear'),TypeError);
  assert.throws(()=>art.createAdapter(()=>{},null),TypeError);
  assert.deepEqual(art.scenes,['watch','hare','squirrel','bear','doubt']);
  art.setEnabled(false);
});
