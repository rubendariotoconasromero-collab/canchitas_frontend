import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';

const base = new URL('../src/app/', import.meta.url);
const read = path => readFileSync(new URL(path, base), 'utf8');
const signal = initial => {
  let value = initial;
  const getter = () => value;
  getter.set = next => { value = next; };
  getter.update = update => { value = update(value); };
  return getter;
};
signal.required = () => signal('');
const core = {
  input: signal, model: signal, signal, computed: compute => compute,
  inject: () => ({onDestroy() {}}), effect() {}, untracked: fn => fn(), forwardRef: fn => fn,
  output: () => ({count: 0, emit() { this.count++; }}),
  ChangeDetectionStrategy: {OnPush: 0}, ViewEncapsulation: {None: 0},
};
function load(path, dependencies = {}) {
  let metadata;
  const exports = {};
  const source = read(path);
  const code = ts.transpileModule(source, {compilerOptions: {
    module: ts.ModuleKind.CommonJS, experimentalDecorators: true,
  }}).outputText;
  vm.runInNewContext(code, {exports, require: name => name === '@angular/core'
    ? {...core, Component: options => { metadata = options; return value => value; }, ...dependencies.core}
    : dependencies[name] ?? new Proxy({}, {get: () => class {}})});
  assert.equal(parseTemplate(metadata.template, path).errors, null, path);
  return {exports, metadata};
}
const toolbar = load('shared/components/list-toolbar/list-toolbar.component.ts');
const instance = new toolbar.exports.ListToolbarComponent();
assert.equal(instance.total(), null, 'Do not invent counts for context-only toolbars');
assert.equal(instance.active(), null);
assert.equal(instance.searchEnabled(), true);
assert.equal(instance.showRefresh(), false);
assert.equal(instance.loading(), false);
instance.query.set('Bernabeu');
assert.equal(instance.query(), 'Bernabeu');
assert.match(toolbar.metadata.template, /ng-content select="\[toolbar-filter\]"/);
assert.match(toolbar.metadata.template, /\[\(value\)\]="query"/);
assert.match(toolbar.metadata.template, /\[disabled\]="loading\(\)"/);
const refresh = parseTemplate(toolbar.metadata.template, 'toolbar').nodes;
function elements(nodes, name, found = []) {
  for (const node of nodes ?? []) {
    if (node.name === name) found.push(node);
    elements(node.children, name, found);
    for (const branch of node.branches ?? []) elements(branch.children, name, found);
  }
  return found;
}
const refreshEvent = elements(refresh, 'app-button')[0].outputs.find(output => output.name === 'clicked');
vm.runInNewContext(refreshEvent.handler.source, instance);
assert.equal(instance.refreshed.count, 1, 'Refresh happens only through the explicit action');

const search = load('shared/components/search-field/search-field.component.ts');
const field = new search.exports.SearchFieldComponent();
const other = new search.exports.SearchFieldComponent();
assert.notEqual(field.id, other.id, 'Labels must reference unique search inputs');
assert.match(search.metadata.template, /\[for\]="id"/);
assert.match(search.metadata.template, /\[id\]="id"/);
const parsedSearch = parseTemplate(search.metadata.template, 'search').nodes;
const inputEvent = elements(parsedSearch, 'input')[0].outputs.find(output => output.name === 'input');
vm.runInNewContext(inputEvent.handler.source, {value: field.value, $any: value => value, $event: {target: {value: 'Juan'}}});
assert.equal(field.value(), 'Juan');
let focused = false;
const clearEvent = elements(parsedSearch, 'button')[0].outputs.find(output => output.name === 'click');
vm.runInNewContext(clearEvent.handler.source, {value: field.value, search: {focus: () => { focused = true; }}});
assert.equal(field.value(), '');
assert.equal(focused, true);
load('shared/components/filter-context/filter-context.component.ts');

const calls = [];
const api = {
  branches: () => ({subscribe: observer => observer.next([{id: 1, nombre: 'Central'}])}),
  clients: (branch, query) => { calls.push([branch, query]); return {subscribe: observer => observer.next([])}; },
};
class ReservasService {}
class ActivatedRoute {}
const clients = load('features/reservas/clientes.component.ts', {
  core: {inject: token => token === ReservasService ? api : token === ActivatedRoute
    ? {snapshot: {queryParamMap: {get: () => null}}} : {can: () => true}},
  '@angular/router': {ActivatedRoute},
  './reservas.service': {ReservasService, apiError: String},
  './reservas-ui': {RESERVAS_UI: []},
});
const client = new clients.exports.ClientesComponent();
const queryEvent = elements(parseTemplate(clients.metadata.template, 'clients').nodes, 'app-list-toolbar')[0]
  .outputs.find(output => output.name === 'queryChange');
vm.runInNewContext(queryEvent.handler.source, {set search(value) {client.search = value;}, load: () => client.load(), $event: 'Juan'});
assert.deepEqual(calls.at(-1), ['1', 'Juan'], 'Search text must be updated before loading clients');
client.search = ''; client.branch = '2'; client.load();
assert.deepEqual(calls.at(-1), ['2', ''], 'Clearing search and changing branch must update API arguments');

for (const [path, Class, state, filtered, rows, term] of [
  ['usuarios/usuarios', 'UsuariosComponent', 'usuarios', 'filteredUsuarios',
    [{id: 1, nombre: 'Ana', correo: 'ana@gmail.com', sucursal: {nombre: 'Central'}},
      {id: 2, nombre: 'Luis', correo: 'luis@gmail.com', sucursal: {nombre: 'Norte'}}], ' CENTRAL '],
  ['roles/roles', 'RolesComponent', 'roles', 'filteredRoles',
    [{id: 1, nombre: 'Cajero', descripcion: 'Cobros'}, {id: 2, nombre: 'Recepcion'}], ' COBROS '],
  ['permisos/permisos', 'PermisosComponent', 'permisos', 'filteredPermisos',
    [{id: 1, nombre: 'caja.ver', descripcion: 'Consultar caja'}, {id: 2, nombre: 'usuarios.ver'}], ' CAJA '],
]) {
  const loaded = load(`features/${path}.component.ts`);
  const component = new loaded.exports[Class]();
  component[state].set(rows);
  component.query.set(term);
  assert.deepEqual(Array.from(component[filtered](), row => row.id), [1], path);
  component.query.set('inexistente'); assert.equal(component[filtered]().length, 0);
  component.query.set(''); assert.equal(component[filtered]().length, 2);
  const binding = elements(parseTemplate(loaded.metadata.template, path).nodes, 'app-list-toolbar')[0];
  assert.equal(binding.inputs.find(input => input.name === 'query').value.source, 'query');
  assert.ok(binding.outputs.some(output => output.name === 'queryChange'), `${path}: missing two-way search binding`);
}

class FormControl {
  constructor(value) { this.value = value; this.valueChanges = {subscribe: fn => {this.changed = fn;}}; }
  setValue(value) { this.value = value; this.changed?.(value); }
}
const catalog = load('features/catalogo/catalog-list.component.ts', {
  '@angular/forms': {FormControl, FormGroup: class {}},
});
const list = new catalog.exports.CatalogListComponent();
list.rows.set([{id: 1, nombre: 'La Cantera'}, {id: 2, nombre: 'Bernabeu'}]);
const catalogEvent = elements(parseTemplate(catalog.metadata.template, 'catalog').nodes, 'app-list-toolbar')[0]
  .outputs.find(output => output.name === 'queryChange');
vm.runInNewContext(catalogEvent.handler.source, {search: list.search, $event: ' CANTERA '});
assert.deepEqual(Array.from(list.filtered(), row => row.id), [1]);
list.search.setValue('   '); assert.equal(list.filtered().length, 2);
list.search.setValue('inexistente'); assert.equal(list.filtered().length, 0);

const pending = [];
const agenda = load('features/reservas/agenda.component.ts', {
  core: {inject: () => ({options: () => ({subscribe() {}})})},
  './reservas-ui': {RESERVAS_UI: []},
  './agenda.utils': {localDate: () => '2026-10-11'},
});
const schedule = new agenda.exports.AgendaComponent();
schedule.api = {agenda: params => {pending.push({params, observer: null}); return {subscribe: observer => {pending.at(-1).observer = observer;}};}};
schedule.branch = '1'; schedule.court = '10'; schedule.load();
assert.equal(pending.at(-1).params.cancha, '10');
schedule.court = ''; schedule.load();
assert.equal(pending.at(-1).params.cancha, undefined, 'Clearing court includes all courts');
schedule.day = '2026-10-12'; schedule.load();
assert.equal(pending.at(-1).params.fecha, '2026-10-12');
schedule.day = ''; schedule.load();
pending.at(-1).observer.next({reservas: []});
assert.equal(schedule.agenda(), null, 'A late response must not repopulate a cleared date');
assert.equal(schedule.loading(), false);
schedule.branch = '2'; schedule.day = '2026-10-13'; schedule.court = '10'; schedule.branchChanged();
assert.equal(schedule.court, '', 'Changing branch resets the previous court');
assert.equal(pending.at(-1).params.sucursal, '2');
schedule.agenda.set({reservas: [{id: 1, estado: 'CONFIRMADA', detalle: {inicio: '2026-10-13T12:00:00Z'}},
  {id: 2, estado: 'CANCELADA', detalle: {inicio: '2026-10-13T14:00:00Z'}}]});
schedule.state = 'CONFIRMADA'; assert.equal(schedule.reservations.length, 1);
schedule.state = ''; assert.equal(schedule.reservations.length, 2);

const cash = load('features/caja/caja.component.ts', {
  core: {inject: () => ({options: () => ({subscribe() {}})})},
  '../reservas/reservas-ui': {RESERVAS_UI: []},
});
const desk = new cash.exports.CajaComponent();
desk.sessions = [{id: 1, cierre: null}, {id: 2, cierre: '2026-10-10'}];
const details = [];
const originalDetails = desk.loadDetails;
desk.loadDetails = session => details.push(session?.id ?? null);
desk.selectId('2'); assert.equal(desk.selected().id, 2);
desk.selectId(''); assert.equal(desk.selected(), null); assert.equal(details.at(-1), 1, 'Clearing turn restores the current turn');
desk.sessions = [{id: 2, cierre: '2026-10-10'}];
desk.selectId(''); assert.equal(details.at(-1), null, 'No open turn means empty detail, not old history');
desk.movements = [{id: 1, medio: 'QR'}, {id: 2, medio: 'Efectivo'}];
desk.movementFilter = 'QR'; assert.equal(desk.filteredMovements[0].id, 1);
desk.movementFilter = ''; assert.equal(desk.filteredMovements.length, 2);
desk.loadDetails = originalDetails;
const oldDetails = [];
desk.api = {movements: () => ({subscribe: observer => oldDetails.push(observer)}), receipts: () => ({subscribe: observer => oldDetails.push(observer)})};
desk.loadDetails({id: 2}); desk.selected.set({id: 2}); desk.box = ''; desk.loadSessions();
assert.equal(desk.detailsLoading(), false); assert.equal(desk.selected(), null);
oldDetails[0].next([{id: 99}]); oldDetails[1].next([{id: 99}]);
assert.equal(desk.movements.length, 0); assert.equal(desk.receipts.length, 0);

const nativeSelect = load('shared/components/select/select.component.ts');
const selector = new nativeSelect.exports.SelectComponent();
let selectedValue = null, touched = false;
selector.registerOnChange(value => { selectedValue = value; });
selector.registerOnTouched(() => { touched = true; });
selector.writeValue(2); assert.equal(selector._value(), '2'); assert.equal(selectedValue, null);
selector.onSelect('3'); assert.equal(selectedValue, '3');
selector.onSelect(''); assert.equal(selectedValue, '');
selector.writeValue(null); assert.equal(selector._value(), '');
selector.onBlur(); assert.equal(touched, true);
selector.setDisabledState(true); assert.equal(selector._disabled(), true);

const listings = ['usuarios/usuarios', 'roles/roles', 'permisos/permisos', 'catalogo/catalog-list',
  'reservas/clientes', 'reservas/agenda', 'caja/caja', 'dashboard/dashboard'];
for (const path of listings) {
  const source = read(`features/${path}.component.ts`);
  assert.match(source, /<app-list-toolbar/, `${path}: shared filter toolbar missing`);
  assert.doesNotMatch(source, /class="(?:catalog-toolbar|agenda-filters|cash-filter|dashboard-branch|operation-toolbar)/);
}
function auditListings(directory) {
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) auditListings(path);
    else if (entry.name.endsWith('.component.ts')) {
      const source = readFileSync(path, 'utf8');
      if (/<app-list-shell|<table|class="list-row"/.test(source)) {
        assert.match(source, /<app-list-toolbar/, `${path}: an unaudited listing is missing shared filters`);
      }
    }
  }
}
auditListings(new URL('features/', base));
assert.match(read('features/catalogo/cancha-detail.component.ts'), /<app-catalog-list/);
assert.match(read('features/catalogo/catalog-page.component.ts'), /<app-catalog-list/);
assert.match(read('features/catalogo/catalog-list.component.ts'), /\(queryChange\)="search.setValue\(\$event\)"/);
assert.match(read('features/reservas/agenda.component.ts'), /app-search-select toolbar-filter label="Cancha"/);
assert.match(read('features/caja/caja.component.ts'), /app-select toolbar-filter label="Medio del movimiento"/);
const css = read('shared/components/list-toolbar/list-toolbar.component.css');
assert.match(css, /flex-wrap: wrap/);
assert.match(css, /max-width: 560px/);
assert.match(css, /min-width: 0/);
assert.doesNotMatch(read('shared/components/list-shell/list-shell.component.css'), /app-list-toolbar\s*\+\s*app-list-shell/,
  'Unframed filters must not remove the table border');
console.log('Shared filters: projection, optional counts, manual refresh, accessible search/clear, client query ordering and eight screen integrations passed without browser.');
console.log('Listing audit: all feature list templates and delegated court/catalog lists use shared filters.');
console.log('Search and selection: user/role/permission/catalog queries, branch/court/date/state changes, native select callbacks, cash turn/media selection and stale-response cleanup passed.');
