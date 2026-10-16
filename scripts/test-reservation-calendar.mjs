import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compile = name => ts.transpileModule(readFileSync(new URL(`../src/app/features/reservas/${name}.ts`, import.meta.url), 'utf8'),
  {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
const agenda = {}, calendar = {};
vm.runInNewContext(compile('agenda.utils'), {exports: agenda, Date, Intl});
vm.runInNewContext(compile('reservation-calendar.utils'), {exports: calendar, Date, require: () => agenda});
const {calendarRange, moveCalendarDay, selectionDraft, calendarEvents, occupies} = calendar;
assert.equal(calendarRange('2026-10-08', 'day').end, '2026-10-09');
assert.equal(calendarRange('2026-10-08', 'week').start, '2026-10-05');
assert.equal(calendarRange('2026-10-08', 'week').end, '2026-10-12');
assert.equal(calendarRange('2026-10-08', 'month').start, '2026-09-28');
assert.equal(calendarRange('2026-10-08', 'month').end, '2026-11-09');
assert.equal(moveCalendarDay('2026-01-31', 'month', 1), '2026-02-01');
assert.equal(moveCalendarDay('2026-12-31', 'month', 1), '2027-01-01');
assert.equal(moveCalendarDay('2026-10-08', 'week', -1), '2026-10-01');
assert.equal(selectionDraft('2026-10-08T23:00:00-04:00', '2026-10-09T00:00:00-04:00').cruza_medianoche, true);
assert.equal(selectionDraft('2026-10-08T18:00:00-04:00', '2026-10-08T19:00:00-04:00').hora_fin, '19:00');
assert.equal(selectionDraft('2026-10-08T18:00:00-04:00', '2026-10-10T19:00:00-04:00'), null);
const now = Date.parse('2026-10-08T12:00:00Z');
const reservation = (id, estado) => ({id, estado, retencion_hasta: '2026-10-08T13:00:00Z',
  detalle: {inicio:'2026-10-08T18:00:00-04:00', fin:'2026-10-08T19:00:00-04:00', cancha_nombre:'Cancha A'}, cliente_snapshot:{nombre:'Cliente'}});
const data = {reservas: [reservation(1,'CONFIRMADA'), reservation(2,'CANCELADA'), reservation(3,'PENDIENTE')],
  bloqueos: [{id:1,inicio:'2026-10-08T20:00:00Z',fin:'2026-10-08T21:00:00Z',cancha_nombre:'Cancha A',motivo:'Mantenimiento'}]};
assert.equal(calendarEvents(data, '', now).length, 4);
const filtered = calendarEvents(data, 'CANCELADA', now);
assert.equal(filtered.find(e=>e.id==='reserva-1').display, 'background');
assert.equal(filtered.find(e=>e.id==='bloqueo-1').extendedProps.kind, 'block');
assert.equal(filtered.find(e=>e.id==='reserva-2').display, 'auto');
assert.equal(occupies(data.reservas[1], now), false);
data.reservas[2].retencion_hasta = '2026-10-08T11:00:00Z';
assert.equal(occupies(data.reservas[2], now), false);
assert.equal(calendarEvents(data, '', now).find(e=>e.id==='reserva-3').extendedProps.label, 'Plazo de pago vencido');
assert.equal(calendarEvents(null, '', now).length, 0);
console.log('20 comprobaciones de calendario aprobadas, sin navegador.');
