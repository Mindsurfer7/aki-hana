// Preview adapter: builds a standalone sibling of index.html without editing it.
// Usage: node tools/build-emotional-preview.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = readFileSync(resolve(root, 'index.html'), 'utf8');
const loader = '<script src="art/emotional-art.js"></script>';
if (!input.includes('</body>')) throw new Error('Missing </body> in source');
if (input.includes(loader)) throw new Error('Source already includes the emotional art loader');
const output = input.replace('</body>', `  ${loader}\n</body>`);
const target = resolve(root, 'emotional-preview.html');
writeFileSync(target, output);
process.stdout.write(`Preview ready: ${target}\n`);
