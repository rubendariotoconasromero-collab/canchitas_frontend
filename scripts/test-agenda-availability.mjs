import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {computed, signal} from '@angular/core';
import {parseTemplate} from '@angular/compiler';

let now = Date.parse('2026-10-11T22:07:00Z');
class Clock extends Date { static now() { return now; } }
const read = path => readFileSync(new URL('../src/app/features/reservas/' + path, import.meta.url), 'utf8');
function compile(source, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true,
  }}).outputText, {exports, Date: Clock, Intl, require: name => dependencies[name]
    ?? new Proxy({}, {get: () => class {}})});
  return exports;
}
const utilities = compile(read('agenda.utils.ts'));
let template;
let response;
const api = {
  options: () => ({subscribe() {}}),
  agenda: () => ({subscribe: observer => { response = observer; }}),
};
const exports = compile(read('agenda.component.ts'), {
  '@angular/core': {signal, computed, inject: () => api,
    Component: metadata => { template = metadata.template; return value => value; }},
  './agenda.utils': utilities,
  './reservas-ui': {RESERVAS_UI: []},
});
const component = new exports.AgendaComponent();
component.branch = '1'; component.day = '2026-10-11';
const hours = court => ({cancha: court, inicio: '2026-10-11T12:00:00Z', fin: '2026-10-12T03:00:00Z'});
let data = {
  zona_horaria: 'America/La_Paz',
  canchas: [{id: 1, nombre: 'Bernabeu', activa: true}, {id: 2, nombre: 'La Cantera', activa: true}],
  horarios: [hours(1), hours(2)], reservas: [], bloqueos: [],
};
const refresh = () => { component.load(); response.next(data); };
refresh();
const first = component.free(1);
assert.equal(first.length, 1);
assert.equal(component.slotLabel(first[0].inicio) + ' - ' + component.slotLabel(first[0].fin), '18:07 - 23:00');
assert.equal(component.free(2)[0].inicio, first[0].inicio, 'Both courts use the same time reference');
for (let check = 0; check < 5; check++) {
  now += 1;
  assert.equal(component.free(1), first, 'Actual Angular computed signals must reuse the array during rendering');
  assert.equal(component.free(1)[0].inicio, first[0].inicio, 'Track keys cannot change between reads');
}
now = Date.parse('2026-10-11T22:10:00Z'); refresh();
assert.notEqual(component.free(1), first);
assert.equal(component.slotLabel(component.free(1)[0].inicio), '18:10', 'Manual refresh updates the time reference');

data = {...data, bloqueos: [{cancha: 1, inicio: '2026-10-11T23:00:00Z', fin: '2026-10-12T00:00:00Z'}]};
refresh();
assert.equal(component.free(1).length, 2);
assert.equal(component.free(2).length, 1, 'A block affects only its court');
data = {...data, bloqueos: [], reservas: [{estado: 'PENDIENTE', retencion_hasta: '2026-10-11T22:15:00Z', detalle: hours(1)}]};
refresh(); assert.equal(component.free(1).length, 0);
now = Date.parse('2026-10-11T22:16:00Z');
assert.equal(component.free(1).length, 0, 'Clock changes cannot mutate the loaded snapshot');
refresh(); assert.equal(component.free(1).length, 1, 'Expired retention is freed after refresh');
for (const state of ['CONFIRMADA', 'EN_CURSO', 'FINALIZADA']) {
  data = {...data, reservas: [{estado: state, detalle: hours(1)}]};
  refresh(); assert.equal(component.free(1).length, 0, state);
}
data = {...data, reservas: [{estado: 'CANCELADA', detalle: hours(1)}]};
refresh(); assert.equal(component.free(1).length, 1);
data = {...data, reservas: [], horarios: [{...hours(1), fin: '2026-10-12T05:00:00Z'}]};
refresh(); assert.match(component.slotLabel(component.free(1)[0].fin), /12\/10/);
assert.equal(component.availabilityStatus(2, true), 'Sin horario configurado');
now = Date.parse('2026-10-12T06:00:00Z'); refresh();
assert.equal(component.free(1).length, 0);
assert.equal(component.availabilityStatus(1, true), 'Jornada finalizada');
component.agenda.set(null); assert.equal(component.free(1).length, 0);
assert.equal(parseTemplate(template, 'agenda').errors, null);
assert.match(template, /@let slots = free\(c.id\)/);
assert.match(template, /@for\(slot of slots;track slot.inicio\)/);
assert.match(template, /<span>\{\{slotLabel\(slot.inicio\)\}\} - \{\{slotLabel\(slot.fin\)\}\}<\/span>/);
console.log('Agenda availability: actual Angular signal caching, stable interval keys, both court labels, manual refresh, blocks, retention expiry, reservation states, overnight hours and cleared data passed without browser.');
