import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { parseTemplate } from '@angular/compiler';

const base = new URL('../src/app/', import.meta.url);
const read = path => readFileSync(new URL(path, base), 'utf8');
const signal = value => { const fn = () => value; fn.set = next => value = next; return fn; };
signal.required = () => signal(undefined);
let template;
function load(path) {
  const exports = {};
  const code = ts.transpileModule(read(path), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true,
  } }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (name === '@angular/core') return {
      Component: meta => { template = meta.template; return value => value; },
      ChangeDetectionStrategy: { OnPush: 0 }, signal, input: signal, computed: fn => fn,
      viewChildren: () => () => [], output: () => ({ values: [], emit(value) { this.values.push(value); } }),
    };
    if (name.endsWith('/reservas-ui')) return { RESERVAS_UI: [] };
    return new Proxy({}, { get: () => class {} });
  } });
  assert.equal(parseTemplate(template, path).errors, null, path);
  return exports;
}

const { TabsComponent } = load('shared/components/tabs/tabs.component.ts');
const tabs = new TabsComponent();
tabs.items = () => [{ key: 'first', label: 'Primera', icon: 'payments' },
  { key: 'blocked', label: 'Bloqueada', disabled: true }, { key: 'last', label: 'Ultima' }];
tabs.selected = signal('first');
assert.equal(tabs.activeItem().key, 'first');
assert.equal(tabs.tabIndex('first'), 0);
assert.equal(tabs.tabIndex('last'), -1);
tabs.choose('first'); tabs.choose('blocked'); tabs.choose('missing');
assert.equal(tabs.selectedChange.values.length, 0, 'Same, disabled and missing tabs cannot trigger actions');
tabs.choose('last');
assert.deepEqual(tabs.selectedChange.values, ['last']);
assert.equal(tabs.selected(), 'first', 'Selection remains controlled by the screen');

const focused = [];
tabs.buttons = () => tabs.items().map(item => ({ nativeElement: { focus: () => focused.push(item.key) } }));
let prevented = 0;
const key = (value, from) => tabs.keyDown({ key: value, preventDefault: () => prevented++ }, from);
key('ArrowRight', 'first'); assert.equal(focused.at(-1), 'last');
key('ArrowRight', 'last'); assert.equal(focused.at(-1), 'first');
key('ArrowLeft', 'first'); assert.equal(focused.at(-1), 'last');
key('Home', 'last'); assert.equal(focused.at(-1), 'first');
key('End', 'first'); assert.equal(focused.at(-1), 'last');
key('ArrowRight', 'blocked'); key('Tab', 'first'); key('Enter', 'last');
assert.equal(prevented, 5);
assert.equal(tabs.selectedChange.values.length, 1, 'Moving focus does not request data or select a tab');
assert.equal(tabs.tabIndex('last'), 0);
tabs.leave({ currentTarget: { contains: () => true }, relatedTarget: {} });
assert.equal(tabs.focused(), 'last');
tabs.leave({ currentTarget: { contains: () => false }, relatedTarget: null });
assert.equal(tabs.focused(), null); assert.equal(tabs.tabIndex('first'), 0);
tabs.disabled = () => true; tabs.choose('last'); key('ArrowRight', 'first');
assert.equal(tabs.selectedChange.values.length, 1); assert.equal(prevented, 5);
assert.equal(tabs.tabIndex('first'), -1);
tabs.disabled = () => false; tabs.items = () => []; key('Home', 'first');
assert.equal(tabs.activeItem(), undefined); assert.equal(tabs.tabIndex('first'), -1);
assert.notEqual(tabs.panelId, new TabsComponent().panelId, 'Instances cannot share ARIA IDs');
assert.match(template, /role="tablist"/); assert.match(template, /role="tab"/);
assert.match(template, /role="tabpanel"/); assert.match(template, /aria-selected/);
assert.match(template, /aria-controls/); assert.match(template, /aria-labelledby/);
assert.match(template, /aria-hidden="true"/);

const { CanchaDetailComponent } = load('features/catalogo/cancha-detail.component.ts');
const court = Object.create(CanchaDetailComponent.prototype);
let permissions = new Set(['canchas.ver', 'fotos.ver']);
Object.assign(court, { selected: signal('cancha-deportes'),
  tabs: [{ key: 'cancha-deportes' }, { key: 'fotos' }, { key: 'horarios' }, { key: 'politicas' }],
  configs: { 'cancha-deportes': { permission: 'canchas' }, fotos: { permission: 'fotos' },
    horarios: { permission: 'horarios' }, politicas: { permission: 'politicas' } },
  auth: { can: permission => permissions.has(permission) },
});
// Computed expressions are evaluated from the actual class source, including permission checks.
const courtSource = read('features/catalogo/cancha-detail.component.ts');
for (const field of ['visibleTabs', 'activeTab']) {
  const expression = courtSource.match(new RegExp(`readonly ${field} = computed\\((.*)\\);`))[1];
  court[field] = vm.runInNewContext(`(function() { return ${expression}; })`, {}).call(court);
}
assert.deepEqual(Array.from(court.visibleTabs(), item => item.key), ['cancha-deportes', 'fotos']);
court.selectTab('horarios'); assert.equal(court.activeTab(), 'cancha-deportes');
court.selectTab('fotos'); assert.equal(court.activeTab(), 'fotos');
permissions = new Set(['horarios.ver']); assert.equal(court.activeTab(), 'horarios');
permissions.clear(); assert.equal(court.activeTab(), '');
assert.match(courtSource, /auth\.can\(configs\[tab.key\].permission \+ '\.ver'\)/);
assert.match(courtSource, /tab.key === 'politicas' \? branchFilter\(\) : filter/);

const { ContentWebComponent } = load('features/contenido-web/content-web.component.ts');
const web = Object.create(ContentWebComponent.prototype);
let busy = false, checks = 0;
Object.assign(web, { tab: signal('presentacion'), tabs: [{ key: 'presentacion' }, { key: 'publicacion' }],
  busy: () => busy, loadStatus: () => checks++ });
busy = true; web.select('publicacion'); assert.equal(checks, 0);
busy = false; web.select('missing'); web.select('presentacion'); assert.equal(checks, 0);
web.select('publicacion'); assert.equal(web.tab(), 'publicacion'); assert.equal(checks, 1);
web.select('publicacion'); assert.equal(checks, 1);
assert.match(read('features/contenido-web/content-web.component.ts'), /\[disabled\]="busy\(\)"/);

const { CajaComponent } = load('features/caja/caja.component.ts');
const cash = Object.create(CajaComponent.prototype);
const details = [];
Object.assign(cash, { tab: 'history', tabs: [{ key: 'current' }, { key: 'movements' }, { key: 'history' }],
  selected: signal({ id: 3 }), sessions: [{ id: 1, cierre: null }], loadDetails: value => details.push(value) });
cash.setTab('missing'); assert.equal(cash.tab, 'history');
cash.setTab('current'); assert.equal(cash.selected(), null); assert.equal(details[0].id, 1);
cash.setTab('current'); assert.equal(details.length, 1);
cash.selectSession({ id: 3 }); assert.equal(cash.tab, 'movements'); assert.equal(cash.selected().id, 3);

const screens = ['features/caja/caja.component.ts', 'features/catalogo/cancha-detail.component.ts',
  'features/contenido-web/content-web.component.ts', 'features/reportes/reportes.component.ts'];
for (const file of screens) {
  const source = read(file);
  assert.match(source, /import \{ TabsComponent \}/); assert.match(source, /<app-tabs/);
  assert.match(source, /<\/app-tabs>/); assert.match(source, /\(selectedChange\)=/);
  assert.doesNotMatch(source, /<nav[^>]*(?:tabs|tablist)/);
}
function scan(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = new URL(item.name + (item.isDirectory() ? '/' : ''), directory);
    if (item.isDirectory()) scan(path);
    else if (/\.(ts|html|css)$/.test(item.name) && !path.pathname.includes('/shared/components/tabs/')) {
      assert.doesNotMatch(readFileSync(path, 'utf8'), /(?:cash-tabs|catalog-tabs|content-tabs|report-tabs|nav-tabs|role="tablist")/, path.pathname);
    }
  }
}
scan(base);
console.log('Tabs: shared adoption, controlled selection, disabled states, keyboard, ARIA IDs, permissions, court context, cash history and publication actions passed without browser.');
