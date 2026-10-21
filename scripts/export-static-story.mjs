#!/usr/bin/env node
/** Export real frozen Canvas scenes to 44 WebP images. No animation is used by the slide viewer. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEST = join(ROOT, 'static-story');
const TIMES = [9, 8, 8, 8, 8, 8, 8, 10, 5, 9, 9, 8, 9, 8, 8, 9, 8, 9, 8, 11, 11, 11];
const WIDTH = 1600, HEIGHT = 900;
const source = await readFile(join(ROOT, 'index.html'), 'utf8');
const artTag = /<script\s+src=["']art\/(?:environment-art|character-art|emotional-art|finale-art)\.js["']><\/script>\s*/g;
const tags = source.match(artTag) || [];
if (tags.length !== 4) throw new Error('Expected all four art script tags in main index.html, found ' + tags.length);
const classicSource = source.replace(artTag, '');
const classicPath = join(ROOT, '__static_classic_capture__.html');
const template = await readFile(join(DEST, 'viewer-template.html'), 'utf8');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.mp3':'audio/mpeg','.json':'application/json'};
let server, browser;
try {
  await writeFile(classicPath, classicSource);
  server = createServer(async (req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
    catch { res.writeHead(400); res.end(); return; }
    const absolute = resolve(ROOT, '.' + pathname);
    if (absolute !== ROOT && !absolute.startsWith(ROOT + sep)) { res.writeHead(403); res.end(); return; }
    try {
      const data = await stat(absolute);
      if (!data.isFile()) throw new Error('Not a file');
      res.writeHead(200, {'Content-Type':mime[extname(absolute)] || 'application/octet-stream','Cache-Control':'no-store'});
      createReadStream(absolute).pipe(res);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((ok, fail) => server.listen(0, '127.0.0.1', ok).once('error', fail));
  const port = server.address().port;
  browser = await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--no-sandbox']});
  const page = await browser.newPage({viewport:{width:1920,height:1080}, deviceScaleFactor:1, reducedMotion:'reduce'});
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  for (const mode of ['classic','disney']) {
    const folder = join(DEST,mode);
    await mkdir(join(folder,'frames'), {recursive:true});
    const pageFile = mode === 'classic' ? '__static_classic_capture__.html' : 'index.html';
    const slides = [];
    for (let i=0; i<TIMES.length; i++) {
      errors.length = 0;
      // The unique query forces a full document reload: hash-only navigation reuses frozen scene 1.
      const url = 'http://127.0.0.1:' + port + '/' + pageFile + '?staticExport=' + String(i+1) + '#s' + String(i+1) + 't' + String(TIMES[i]) + 'f';
      await page.goto(url, {waitUntil:'load', timeout:45000});
      await page.waitForFunction(() => document.title.startsWith('ready '), {timeout:45000});
      if (errors.length) throw new Error(mode + ' scene ' + (i+1) + ' JS errors: ' + errors.join('; '));
      const metadata = await page.evaluate(() => SCENES.map(s => ({
        id:s.id, titleRu:s.ch && s.ch[1] || s.id, titleJa:s.ch && s.ch[0] || '', text:s.text || ''
      })));
      if (metadata.length !== 22) throw new Error('Expected 22 scenes, got '+metadata.length);
      const scene = metadata[i];
      const renderedScene = await page.evaluate(() => ({ id: cur && cur.def && cur.def.id, time: cur && cur.t }));
      if (renderedScene.id !== scene.id || Math.abs(renderedScene.time - TIMES[i]) > 0.01) {
        throw new Error('Captured wrong scene: expected ' + scene.id + ' at ' + TIMES[i] + 's, got ' + JSON.stringify(renderedScene));
      }
      const file = String(i+1).padStart(2,'0') + '-' + scene.id + '.webp';
      const data = await page.evaluate(({width,height}) => {
        const src = document.getElementById('stage');
        if (!src || !src.width || !src.height) throw new Error('No rendered stage');
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d',{alpha:false}).drawImage(src,0,0,width,height);
        return canvas.toDataURL('image/webp',0.84);
      },{width:WIDTH,height:HEIGHT});
      if (!data.startsWith('data:image/webp;base64,')) throw new Error('WebP encoding unavailable');
      const buffer = Buffer.from(data.slice('data:image/webp;base64,'.length),'base64');
      if (buffer.length < 1000) throw new Error('Empty/corrupt WebP image for '+file);
      await writeFile(join(folder,'frames',file),buffer);
      slides.push({...scene,index:i+1,time:TIMES[i],image:'frames/'+file});
      console.log(mode+' '+String(i+1).padStart(2,'0')+'/22 '+file+' '+Math.round(buffer.length/1024)+' KiB');
    }
    const manifest = JSON.stringify(slides,null,2)+'\n';
    await writeFile(join(folder,'manifest.json'),manifest);
    const jsonInline = JSON.stringify(slides).replace(/</g,'\\u003c');
    const html = template.replaceAll('__VERSION_NAME__',mode==='classic'?'До редизайна':'После редизайна')
      .replace('__STORY_DATA__',jsonInline);
    await writeFile(join(folder,'index.html'),html);
  }
  console.log('Done: 44 actual WebP frames + 2 standalone viewers');
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(done => server.close(done));
  await rm(classicPath,{force:true});
}
