#!/usr/bin/env node
/**
 * Finale art capture + pixel-regression smoke test.
 *
 * Prerequisite: serve the repository root, then provide Playwright:
 *   python3 -m http.server 8000
 *   npm install --no-save playwright
 *   npx playwright install chromium
 *   node art/capture-finale.mjs
 *
 * Override the preview URL with AKI_PREVIEW_URL.
 * Generated PNGs/JSON remain untracked (art/before-after/).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const outputDir = join(dir, 'before-after');
const url = process.env.AKI_PREVIEW_URL || 'http://localhost:8000/art/finale-preview.html';

let playwright;
try {
  playwright = await import('playwright');
} catch {
  console.error('Install optional Playwright: npm install --no-save playwright && npx playwright install chromium');
  process.exit(2);
}
await mkdir(outputDir, { recursive: true });

const browser = await playwright.chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1680, height: 1050 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
const report = [];
try {
  await page.goto(url, { waitUntil: 'load' });
  const plans = [
    [17, 'default'], [18, 'default'], [19, 'default'],
    [20, 'early'], [20, 'middle'], [20, 'end'],
    [21, 'default'],
    [22, 'early'], [22, 'middle'], [22, 'end'],
  ];
  for (const [scene, moment] of plans) {
    await page.selectOption('#scene', String(scene));
    await page.selectOption('#time', moment);
    await page.waitForFunction(() =>
      document.getElementById('status').textContent.startsWith('Оба кадра готовы.'),
    { timeout: 20000 });
    const frames = await page.evaluate(() => {
      const b = document.querySelector('#before').contentWindow.document.querySelector('#stage');
      const a = document.querySelector('#after').contentWindow.document.querySelector('#stage');
      const getData = c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      if (b.width !== a.width || b.height !== a.height) throw Error('Canvas sizes differ');
      const px = getData(b), py = getData(a);
      let delta = 0, touched = 0;
      for (let i = 0; i < px.length; i += 4) {
        const d = Math.abs(px[i] - py[i]) + Math.abs(px[i + 1] - py[i + 1]) + Math.abs(px[i + 2] - py[i + 2]);
        delta += d;
        if (d >= 12) touched++;
      }
      return {
        before: b.toDataURL('image/png').split(',')[1],
        after: a.toDataURL('image/png').split(',')[1],
        meanRGBDelta: Number((delta / (px.length / 4) / 3).toFixed(3)),
        changedPixelPercent: Number((100 * touched / (px.length / 4)).toFixed(2)),
        size: [a.width, a.height],
      };
    });
    const name = String(scene).padStart(2, '0') + '-' + moment;
    await writeFile(join(outputDir, name + '-before.png'), Buffer.from(frames.before, 'base64'));
    await writeFile(join(outputDir, name + '-after.png'), Buffer.from(frames.after, 'base64'));
    report.push({ scene, moment, meanRGBDelta: frames.meanRGBDelta,
      changedPixelPercent: frames.changedPixelPercent, size: frames.size });
    console.log(name, report.at(-1));
    if (frames.meanRGBDelta < 0.5) {
      throw Error('No meaningful art change found in scene ' + name);
    }
    // Re-check the reversible fallback without reloading the original renderer.
    await page.click('#toggle');
    const restored = await page.evaluate(() => {
      const b = document.querySelector('#before').contentWindow.document.querySelector('#stage');
      const a = document.querySelector('#after').contentWindow.document.querySelector('#stage');
      const x = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
      const y = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
      let error = 0;
      for (let i = 0; i < x.length; i += 4)
        error += Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]);
      return error / x.length * 4 / 3;
    });
    // The source uses time-based flicker, motes and grain. Fallback should
    // closely match, not necessarily be pixel-identical.
    if (restored > 6) throw Error('Legacy fallback deviates in ' + name + ': ' + restored);
    report.at(-1).legacyMeanRGBDelta = Number(restored.toFixed(3));
    await page.click('#toggle');
  }
  await writeFile(join(outputDir, 'results.json'), JSON.stringify({ url, report }, null, 2));
  console.log('All finale comparisons captured at', outputDir);
} finally {
  await browser.close();
}
