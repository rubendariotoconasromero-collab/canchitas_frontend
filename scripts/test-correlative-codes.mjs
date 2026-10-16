import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { parseTemplate } from '@angular/compiler';

const base = new URL('../src/app/', import.meta.url);
const read = path => readFileSync(new URL(path, base), 'utf8');
const signal = value => { const fn = () => value; fn.set = next => value = next; return fn; };
class PublicService {} class ActivatedRoute {} class SnackbarService {}
const records = new Map(), requests = [], copied = [], notices = [];
const providers = new Map([
  [PublicService, { credential: () => 'secret', track: (...args) => ({ subscribe: observer => requests.push({ args, observer }) }) }],
  [ActivatedRoute, { snapshot: { paramMap: { get: () => 'old-uuid' } } }],
  [SnackbarService, { success: message => notices.push(message) }],
]);
function load(path) {
  const exports = {};
  let template;
  vm.runInNewContext(ts.transpileModule(read(path), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true,
  } }).outputText, { exports, history: { state: {} }, Intl, Date,
    sessionStorage: { setItem: (key, value) => records.set(key, value), getItem: key => records.get(key) },
    navigator: { clipboard: { writeText: text => { copied.push(text); return Promise.resolve(); } } },
    require: name => {
      if (name === '@angular/core') return { Component: meta => { template = meta.template; return value => value; },
        Injectable: () => value => value, inject: token => providers.get(token), signal };
      if (name === '@angular/router') return { ActivatedRoute };
      if (name.endsWith('/snackbar.service')) return { SnackbarService };
      if (name.endsWith('/public.service')) return { PublicService, requestLabels: {} };
      if (name.endsWith('/reservas-ui')) return { RESERVAS_UI: [] };
      if (name.endsWith('/reservas.service')) return { apiError: () => 'Error' };
      return new Proxy({}, { get: () => class {} });
    },
  });
  if (template) assert.equal(parseTemplate(template, path).errors, null);
  return exports;
}
const { PublicService: StorageService } = load('features/publico/public.service.ts');
const storage = new StorageService();
storage.remember({ codigo: 'old-uuid', codigo_correlativo: 'SOL-1000000', token: 'secret' });
assert.equal(storage.credential('old-uuid'), 'secret');
assert.equal(storage.credential('SOL-1000000'), 'secret');
assert.equal(records.size, 2, 'Both old and visible codes retain the private tracking credential');
const { PublicTrackingComponent } = load('features/publico/public-tracking.component.ts');
const tracking = new PublicTrackingComponent();
assert.deepEqual(Array.from(requests[0].args), ['old-uuid', 'secret']);
requests[0].observer.next({ codigo: 'old-uuid', codigo_correlativo: 'SOL-1000000', estado: 'PENDIENTE' });
assert.equal(tracking.code, 'SOL-1000000');
tracking.consult(); assert.deepEqual(Array.from(requests[1].args), ['SOL-1000000', 'secret']);
tracking.copy(); await Promise.resolve();
assert.equal(copied[0], 'Codigo: SOL-1000000\nClave: secret'); assert.equal(notices.length, 1);
const { REPORT_COLUMNS } = load('features/reportes/reportes.config.ts');
assert.equal(REPORT_COLUMNS.reservas[0].key, 'codigo');
assert.equal(REPORT_COLUMNS.cobros[0].key, 'numero');
assert.equal(REPORT_COLUMNS.cobros[1].key, 'codigo_pago');
for (const path of ['reservas/agenda.component.ts', 'reservas/solicitudes.component.ts', 'publico/public-tracking.component.ts']) {
  assert.match(read('features/' + path), /codigo_correlativo/);
}
assert.match(read('features/caja/receipt.component.ts'), /r.codigo_reserva \|\| r.datos.codigo_reserva/);
assert.match(read('features/caja/receipt.component.ts'), /r.codigo_pago/);
assert.match(read('features/catalogo/catalog.config.ts'), /key:'codigo_correlativo',label:'Codigo'/);
assert.match(read('features/publico/public-court.component.ts'), /\['\/mis-solicitudes',r.codigo_correlativo \|\| r.codigo\]/);
console.log('Correlative codes: public navigation, private credentials, old links, clipboard, seven-digit values, report columns and admin displays passed without browser.');
