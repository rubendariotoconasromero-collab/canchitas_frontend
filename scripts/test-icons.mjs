import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {iconInventory, iconsInSource} from './icon-inventory.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const font = readFileSync(new URL('../public/assets/fonts/material-symbols-outlined.woff2', import.meta.url));
const manifest = JSON.parse(read('public/assets/fonts/material-symbols-outlined.json'));
const used = iconInventory(fileURLToPath(new URL('../src/app/', import.meta.url)));
const missing = used.filter(icon => !manifest.icons.includes(icon));
assert.deepEqual(missing, [], `Missing local icons: ${missing.join(', ')}. Run npm run icons:update.`);
assert.equal(font.toString('ascii', 0, 4), 'wOF2');
assert.equal(font.readUInt32BE(8), font.length);
assert.equal(createHash('sha256').update(font).digest('hex'), manifest.sha256);
const paths = [...read('src/index.html').matchAll(/assets\/fonts\/material-symbols-outlined\.woff2\?v=([a-z0-9]+)/g)];
assert.equal(paths.length, 2); assert.ok(paths.every(match => match[1] === manifest.sha256.slice(0, 12)), 'Preload and font-face must use the updated local font');
assert.match(read('src/index.html'), /font-display:\s*block/);
assert.match(read('src/styles.css'), /text-transform:\s*none/);
assert.match(read('src/styles.css'), /font-variant-ligatures:\s*common-ligatures/);
for (const icon of ['web', 'tune', 'view_agenda', 'share', 'call', 'mail', 'chat', 'north_east', 'calculate', 'send', 'fact_check', 'check', 'event', 'arrow_upward', 'arrow_downward']) {
  assert.ok(used.includes(icon), `Audit must find ${icon}`); assert.ok(manifest.icons.includes(icon));
}
assert.deepEqual(iconsInSource(`
  const config={icon: enabled ? 'web' : 'tune'};
  const icons={success:'check_circle',error:'error'};
  class Control {icon=input('help');}
  const component={template:\`@if(ok){<span class="material-symbols-outlined">call</span>}
    <app-button [icon]="state==='open' ? 'lock' : 'close'" />
    <span class="material-symbols-outlined">{{ok ? 'share' : 'mail'}}</span>\`};
`), ['call','check_circle','close','error','help','lock','mail','share','tune','web']);
assert.deepEqual(iconsInSource('<app-button icon="save" /><span class="material-symbols-outlined">search</span>', 'test.html'), ['save','search']);
console.log(`Icon audit passed: ${used.length} local icons across templates, dynamic bindings, config, badges, notifications and defaults; asset hash and cache version verified without browser.`);
