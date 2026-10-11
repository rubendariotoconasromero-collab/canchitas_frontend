import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

// Include dynamic names (ternaries, config and defaults), not just literal spans.
const icons = [
  'add', 'admin_panel_settings', 'api', 'arrow_forward', 'badge', 'calendar_month',
  'cancel', 'check_circle', 'close', 'contact_phone', 'content_copy', 'database',
  'delete', 'edit', 'error', 'expand_less', 'expand_more', 'group', 'help', 'help_outline',
  'image', 'inbox', 'info', 'key', 'keyboard_double_arrow_left',
  'keyboard_double_arrow_right', 'location_on', 'lock', 'login', 'logout',
  'manage_accounts', 'menu', 'monitoring', 'more_horiz', 'more_vert', 'open_in_new', 'panorama', 'payments',
  'person', 'person_add', 'photo_library', 'policy', 'public', 'refresh', 'rule',
  'save', 'schedule', 'search', 'search_off', 'settings', 'shield', 'space_dashboard', 'sports',
  'sports_soccer', 'storefront', 'toggle_off', 'toggle_on', 'verified_user', 'visibility',
  'visibility_off', 'warning',
].sort();
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
// Do not overwrite the working asset until the entire download has been validated.
await writeFile(new URL('../public/assets/fonts/material-symbols-outlined.woff2', import.meta.url), font);
console.log(`${icons.length} iconos locales: ${font.length} bytes.`);
