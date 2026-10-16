import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {iconInventory} from './icon-inventory.mjs';

const icons = iconInventory(fileURLToPath(new URL('../src/app/', import.meta.url)));
assert.ok(icons.length, 'No icons detected in the frontend');
const cssUrl = new URL('https://fonts.googleapis.com/css2');
cssUrl.searchParams.set('family', 'Material Symbols Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
cssUrl.searchParams.set('icon_names', icons.join(','));
const response = await fetch(cssUrl, {
  headers: { 'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36' },
  signal: AbortSignal.timeout(30000),
});
assert.ok(response.ok, `Font stylesheet returned ${response.status}`);
const css = await response.text();
const fontUrl = css.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s*format\('woff2'\)/)?.[1];
assert.ok(fontUrl, 'No official WOFF2 resource found');
const fontResponse = await fetch(fontUrl, { signal: AbortSignal.timeout(60000) });
assert.ok(fontResponse.ok, `Font download returned ${fontResponse.status}`);
const font = Buffer.from(await fontResponse.arrayBuffer());
assert.equal(font.toString('ascii', 0, 4), 'wOF2');
assert.equal(font.readUInt32BE(8), font.length, 'Incomplete WOFF2 download');
const sha256 = createHash('sha256').update(font).digest('hex');
// Keep the preload and font-face on the same content-versioned URL.
const indexUrl = new URL('../src/index.html', import.meta.url);
const index = await readFile(indexUrl, 'utf8');
const fontPath = 'assets/fonts/material-symbols-outlined.woff2?v=';
assert.equal((index.match(/assets\/fonts\/material-symbols-outlined\.woff2\?v=[a-z0-9]+/g) || []).length, 2);
// Validate the download and configuration before replacing any working files.
await writeFile(new URL('../public/assets/fonts/material-symbols-outlined.woff2', import.meta.url), font);
await writeFile(new URL('../public/assets/fonts/material-symbols-outlined.json', import.meta.url), JSON.stringify({icons, sha256}, null, 2) + '\n');
await writeFile(indexUrl, index.replace(/assets\/fonts\/material-symbols-outlined\.woff2\?v=[a-z0-9]+/g, fontPath + sha256.slice(0, 12)));
console.log(`${icons.length} iconos locales: ${font.length} bytes.`);
