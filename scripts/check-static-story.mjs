#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','static-story');
const modes=['classic','disney'];
const manifests=[];
for (const mode of modes) {
  const dir=join(root,mode);
  const slides=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
  manifests.push(slides);
  assert.equal(slides.length,22,mode+' scene count');
  const html=await readFile(join(dir,'index.html'),'utf8');
  assert(html.includes('id="story-data"') && html.includes('frames/01-hokkaido.webp'));
  assert(!html.includes('__STORY_DATA__'));
  assert(!html.includes('<canvas'));
  const uniqueFrames = new Set();
  for (const [i,scene] of slides.entries()) {
    assert.equal(scene.index,i+1);
    assert(scene.titleRu && typeof scene.text==='string');
    const file=join(dir,scene.image);
    const bytes=await readFile(file);
    assert(bytes.byteLength>1000,mode+' '+scene.id);
    assert.equal(bytes.toString('ascii',0,4),'RIFF',file+' RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP',file+' WebP');
    const key = bytes.toString('base64');
    assert(!uniqueFrames.has(key),mode+' duplicate image detected at scene '+(i+1));
    uniqueFrames.add(key);
  }
  console.log(mode+': 22 WebP frames, manifest and slideshow OK');
}
for (let i=0;i<22;i++) {
  assert.equal(manifests[0][i].id,manifests[1][i].id);
  assert.equal(manifests[0][i].time,manifests[1][i].time);
}
console.log('Both versions agree on all 22 scene IDs and timestamps');
