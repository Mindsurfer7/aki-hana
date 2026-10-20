// Browser visual QA: six before/after frames + expression close-up gallery.
// Run: node tools/capture-emotional.mjs  (Chrome / Chromium required)
// Does NOT edit index.html. Output is ignored by Git.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { platform } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dest = resolve(root, 'art/review-shots');
const cases = [
  { id: 'decide', title: 'Решение', number: 11, t: 3.1, x: 56, y: 55 },
  { id: 'wind', title: 'Ветер', number: 12, t: 4.5, x: 63, y: 54 },
  { id: 'offer', title: 'Зайчик предлагает помощь', number: 13, t: 9.5, x: 62, y: 54 },
  { id: 'tired', title: 'Лисичка устала', number: 14, t: 6, x: 55, y: 55 },
  { id: 'bearcomes', title: 'Медвежонок', number: 15, t: 12.5, x: 50, y: 57 },
  { id: 'talk', title: 'Разговор', number: 16, t: 12, x: 50, y: 55 },
];
const chrome = process.env.CHROME_BIN || (platform() === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : 'google-chrome');
const fallback = process.env.CHROME_BIN ? [] : ['chromium', 'chromium-browser'];
mkdirSync(dest, { recursive: true });

function render(browser, source, title) {
  const url = pathToFileURL(resolve(root, source)).href;
  for (const item of cases) {
    const shot = resolve(dest, `${item.id}-${title}.png`);
    const args = ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
      '--hide-scrollbars', '--disable-background-timer-throttling',
      '--force-device-scale-factor=1', '--window-size=1920,1080',
      '--virtual-time-budget=2200', `--screenshot=${shot}`,
      `${url}#s${item.number}t${item.t}f`];
    const result = spawnSync(browser, args, { encoding: 'utf8', timeout: 120000 });
    if (result.error || result.status !== 0) {
      throw new Error(`Chromium failed on ${item.id}/${title}: ${result.error?.message || result.stderr?.slice(-800)}`);
    }
    console.log(`${item.id} ${title}: ${shot}`);
  }
}
const built = spawnSync(process.execPath, [resolve(root, 'tools/build-emotional-preview.mjs')], { stdio: 'inherit' });
if (built.status !== 0) throw new Error('Cannot build emotional preview');
let executable = chrome;
const candidates = [chrome, ...fallback];
let found = false;
for (const name of candidates) {
  const r = spawnSync(name, ['--version'], { encoding: 'utf8' });
  if (r.status === 0) { executable = name; found = true; break; }
}
if (!found) throw new Error('Chrome / Chromium not found: set CHROME_BIN');

render(executable, 'index.html', 'before');
render(executable, 'emotional-preview.html', 'after');

const cards = cases.map(item => {
  const label = item.title.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  const before = `art/review-shots/${item.id}-before.png`;
  const after = `art/review-shots/${item.id}-after.png`;
  return `<section><h2>${String(item.number).padStart(2,'0')} · ${label} · t=${item.t}s</h2>
    <div class="pair">
      <figure><figcaption>До</figcaption><img src="${before}" alt="Before ${item.id}"></figure>
      <figure><figcaption>После</figcaption><img src="${after}" alt="After ${item.id}"></figure>
    </div>
    <h3>Крупный план — эмоция, глаза, поза</h3>
    <div class="pair">
      <figure><figcaption>До · лицо</figcaption><div class="zoom" style="--fx:${item.x}%;--fy:${item.y}%"><img src="${before}" alt=""></div></figure>
      <figure><figcaption>После · лицо</figcaption><div class="zoom" style="--fx:${item.x}%;--fy:${item.y}%"><img src="${after}" alt=""></div></figure>
    </div></section>`;
}).join('\n');
const gallery = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aki Hana · emotional art before/after</title>
<style>body{margin:0;background:#24201d;color:#f7eee0;font:16px system-ui;padding:2rem;max-width:1400px;margin:auto}
h1{font-size:2rem}section{border-top:1px solid #796a55;padding:1.4rem 0 2.3rem}h2{font-size:1.4rem}
h3{font-size:1rem;color:#ddd0c1}.pair{display:grid;grid-template-columns:1fr 1fr;gap:1.2rem}
figure{margin:0}figcaption{margin:.4rem 0}.pair img{display:block;width:100%;height:auto}
.zoom{position:relative;overflow:hidden;aspect-ratio:16/9}.zoom img{width:100%;height:auto;transform:scale(2.4);transform-origin:var(--fx) var(--fy)}
p{color:#d6c9b6}@media(max-width:700px){body{padding:1rem}.pair{grid-template-columns:1fr}}</style></head>
<body><h1>Aki Hana · Team C</h1><p>Шесть сцен: одинаковые моменты исходного и нового рендера; ниже — визуальные увеличения. Проверять теплоту, читаемость глаз и отсутствие скачков положения. Снимки фиксируются в режиме #sNtTf и не включают изменения музыки или таймингов.</p>
${cards}</body></html>`;
const result = resolve(root, 'emotional-review.html');
writeFileSync(result, gallery);
console.log(`Review gallery: ${result}`);
