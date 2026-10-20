#!/usr/bin/env node
/* Optional visual QA (index.html is not edited).
   npm install --no-save playwright
   npx playwright install chromium
   node tools/character-art-qa.mjs
   Output: art/qa (excluded from Git by convention).
*/
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = resolve('art/qa');
await mkdir(dir,{recursive:true});
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const base = pathToFileURL(resolve('index.html')).href;
const script = resolve('art/character-art.js');
const examples = [
  {name:'watch',id:6,t:7.5},
  {name:'hare',id:7,t:5},
  {name:'squirrel',id:8,t:2.4},
  {name:'bear',id:9,t:4.5},
  {name:'doubt',id:10,t:8.5}
];

try {
  for(const ex of examples){
    await page.goto(base+'?q=high#s'+ex.id+'t'+ex.t+'f');
    await page.waitForFunction(()=>document.title.startsWith('ready '),null,{timeout:30000});
    await page.locator('#stage').screenshot({path:dir+'/'+ex.name+'-before.png'});
    await page.addScriptTag({path:script});
    await page.evaluate(()=>{
      window.__oldCreature=creature;
      creature=window.CharacterArt.createAdapter(window.__oldCreature,
        ()=>cur?.def?.id ?? trans?.to?.def?.id ?? null);
      window.CharacterArt.setEnabled(true);
      DBG.frames=0;
      frame(performance.now());
    });
    await page.locator('#stage').screenshot({path:dir+'/'+ex.name+'-after.png'});
    process.stdout.write(ex.name+': before/after\n');
  }
  // Large before/after closeups for all four species.
  await page.evaluate(()=>{
    const board=document.createElement('canvas');
    board.id='character-comparison';board.width=1600;board.height=900;
    document.body.appendChild(board);
    const c=board.getContext('2d');
    const views=[
      ['fox',{mode:'sit',t:7,sad:0.7,head:-0.3,ear:0.5,eye:0.7}],
      ['hare',{mode:'up',t:5,lean:0.65,arm:[1.2,0.9],item:ITEMS.stick(44,0.3)}],
      ['squirrel',{mode:'up',t:3,arm:[1,0.3],item:ITEMS.walnut()}],
      ['bear',{mode:'sit',t:3,arm:[0.7,0.9],item:ITEMS.mallet(0.4)}]
    ];
    c.fillStyle='#f6eddc';c.fillRect(0,0,1600,900);
    c.font='bold 28px sans-serif';c.fillStyle='#543d35';
    c.fillText('BEFORE · Original',120,42);
    c.fillText('AFTER · Character Art B',850,42);
    views.forEach(([kind,P],i)=>{
      const yy=230+i*205;
      const scale=kind==='squirrel'?2.7:1.7;
      window.__oldCreature(c,kind,P,420,yy,scale,{face:1,shadow:0});
      window.CharacterArt.drawCreature(c,kind,P,1160,yy,scale,{face:1,shadow:0});
      c.fillStyle='#543d35';c.font='20px sans-serif';
      c.fillText(kind,10,yy-30);
    });
  });
  await page.locator('#character-comparison').screenshot({path:dir+'/closeups-before-after.png'});
  // Motion sweep: front/back, raised hand, leap, grip.
  await page.evaluate(()=>{
    const canvas=document.querySelector('#character-comparison');
    const c=canvas.getContext('2d');c.clearRect(0,0,1600,900);
    c.fillStyle='#f6eddc';c.fillRect(0,0,1600,900);
    const variants=[
      ['fox',{mode:'back',t:4,turn:0.25,wag:0.5}],
      ['hare',{mode:'up',t:2,lean:0.95,arm:[1.9,0.6],item:ITEMS.stick()}],
      ['squirrel',{mode:'run',t:6,run:8.2,leap:true}],
      ['bear',{mode:'sit',t:5,arm:[0.62,0.68],item:ITEMS.mallet(0.4)}]
    ];
    variants.forEach(([kind,P],i)=>{
      const yy=240+i*195,scale=kind==='squirrel'?2.7:1.6;
      const o={face:i%2?-1:1,shadow:0};
      window.__oldCreature(c,kind,P,380,yy,scale,o);
      window.CharacterArt.drawCreature(c,kind,P,1150,yy,scale,o);
      c.fillStyle='#543d35';c.font='22px sans-serif';
      c.fillText(kind+' motion',12,yy-20);
    });
  });
  await page.locator('#character-comparison').screenshot({path:dir+'/poses-before-after.png'});
  process.stdout.write('QA screenshots: '+dir+'\n');
} finally { await browser.close(); }
