import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/app/features/reservas/agenda.component.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true}}).outputText;
const signal = value => {const read = () => value; read.set = next => value = next; return read;};
const utilitySource = readFileSync(new URL('../src/app/features/reservas/agenda.utils.ts', import.meta.url), 'utf8');
const utilityCode = ts.transpileModule(utilitySource, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
const utilities = {};
vm.runInNewContext(utilityCode, {exports: utilities, Date, Intl});
const calendarSource = readFileSync(new URL('../src/app/features/reservas/reservation-calendar.utils.ts', import.meta.url), 'utf8');
const calendarUtilities = {};
vm.runInNewContext(ts.transpileModule(calendarSource, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText,
  {exports: calendarUtilities, Date, require: () => utilities});
class Auth {}
class Api {}
class Route {}
class Router {}

function setup(query = {}, allowed = true) {
  const writes = [], reads = [];
  const navigations = [];
  let reject = true;
  const response = data => ({subscribe(observer) {observer.next?.(data);}});
  const write = (operation, data) => {
    writes.push({operation, data});
    return {subscribe(observer) {
      if (reject) observer.error({error: {detail: 'La tarifa cambio. Vuelve a cotizar.'}});
      else observer.next({});
    }};
  };
  const api = {
    options: () => response({sucursales: [{id: 1, nombre: 'Sucursal'}], canchas: [
      {id: 10, sucursal: 1, nombre: 'Sin deporte', activa: true},
      {id: 11, sucursal: 1, nombre: 'Inactiva', activa: false},
      {id: 12, sucursal: 2, nombre: 'Otra sucursal', activa: true},
    ], canchas_deportes: []}),
    agenda: filters => {reads.push(filters);return {subscribe() {}};},
    clients: () => response([]),
    quoteMove: () => response({total: '200.00'}),
    change: (id, action, data) => write(action, data),
    reserve: data => write('reserve', data),
    block: data => write('block', data),
  };
  const mocks = {
    '@angular/core': {Component: () => value => value, signal, computed: fn => fn, inject: token => token === Api ? api : token === Auth ? {can: () => allowed} : token === Route ? {queryParamMap:{subscribe:fn=>{fn({get:name=>query[name]??null});return {unsubscribe(){}};}}} : token === Router ? {navigate:(...args)=>{navigations.push(args);return Promise.resolve(true);}} : {success:()=>{}}},
    '@angular/router': {ActivatedRoute:Route, Router},
    '@angular/core/rxjs-interop': {takeUntilDestroyed: () => null},
    rxjs: {interval: () => ({pipe: () => ({subscribe() {}})})},
    '../../core/services/auth.service': {AuthService: Auth},
    '../../core/services/snackbar.service': {SnackbarService: class {}},
    './reservas.service': {ReservasService: Api, apiError: error => error.error.detail},
    './reservas-ui': {RESERVAS_UI: []},
    './agenda.utils': utilities,
    './reservation-calendar.utils': calendarUtilities,
    './reservation-calendar.component': {ReservationCalendarComponent: class {}},
    '../caja/payment-modal.component': {PaymentModalComponent: class {}},
    './cliente-editor.component': {ClienteEditorComponent: class {}},
  };
  const exports = {};
  vm.runInNewContext(code, {exports, Date, Intl, require: name => {
    if (!(name in mocks)) throw Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  }});
  return {component: new exports.AgendaComponent(), writes, reads, navigations, accept: () => reject = false};
}

const operational = setup().component;
assert.deepEqual(Array.from(operational.courtOptions, option => option.value), ['10', '11']);
assert.equal(operational.courtOptions[1].label, 'Inactiva (inactiva)');
assert.equal(operational.linkOptions.length, 0);

const {component, writes, accept} = setup();
component.mode.set('move');
component.moving = 7;
component.draft = {fecha: '2026-10-08', hora_inicio: '18:00', hora_fin: '19:00', cruza_medianoche: false};
const draft = component.draft;
component.quotation.set({total: '100.00'});
component.save();
assert.equal(component.quotation(), null);
assert.equal(component.mode(), 'move');
assert.equal(component.draft, draft);
assert.equal(component.saving(), false);
assert.match(component.formError(), /Vuelve a cotizar/);
component.save();
assert.equal(writes.length, 1, 'No debe reenviar sin una nueva cotizacion');

component.calculate();
assert.equal(component.quotation().total, '200.00');
accept();
component.save();
assert.equal(writes.length, 2);
assert.equal(writes[1].data.total_esperado, '200.00');
assert.equal(component.mode(), '');

const reservation = setup();
reservation.component.mode.set('reserve');
reservation.component.draft = {...draft, cancha_deporte: '3', cliente: 'sin-cliente', notas: 'Conservar'};
reservation.component.quotation.set({total: '100.00'});
reservation.component.save();
assert.equal(reservation.component.quotation(), null);
assert.equal(reservation.component.draft.notas, 'Conservar');
assert.equal(reservation.writes[0].data.sin_cliente, true);

const maintenance = setup();
maintenance.component.mode.set('block');
maintenance.component.draft = {...draft, cancha: '10', notas: 'Mantenimiento'};
maintenance.component.save();
assert.equal(maintenance.writes.length, 1, 'Bloquear no necesita cotizacion');
assert.equal(maintenance.component.mode(), 'block');
assert.equal(maintenance.component.draft.notas, 'Mantenimiento');
operational.agenda.set({zona_horaria:'America/La_Paz',horarios:[],reservas:[],bloqueos:[]});
assert.equal(operational.availabilityStatus(10,false),'Inactiva');
assert.equal(operational.availabilityStatus(10,true),'Sin horario configurado');
operational.agenda.set({zona_horaria:'America/La_Paz',horarios:[{cancha:10,inicio:'2020-01-01T18:00:00Z',fin:'2020-01-01T19:00:00Z'}],reservas:[],bloqueos:[]});
assert.equal(operational.availabilityStatus(10,true),'Jornada finalizada');
const window={cancha:10,inicio:'2099-01-01T18:00:00Z',fin:'2099-01-01T19:00:00Z'};
operational.agenda.set({zona_horaria:'America/La_Paz',horarios:[window],reservas:[],bloqueos:[window]});
assert.equal(operational.free(10).length,0);
assert.equal(operational.availabilityStatus(10,true),'Sin disponibilidad');
operational.day='2026-10-08';operational.days=1;
assert.equal(operational.slotLabel('2026-10-08T22:00:00Z'),'18:00');
assert.match(operational.slotLabel('2026-10-09T04:00:00Z'),/0?9\/10/);
const daily=operational.periodLabel;
operational.days=7;
assert.notEqual(operational.periodLabel,daily);
assert.match(operational.periodLabel,/14/);
const calendarCase = setup(), calendarComponent = calendarCase.component;
calendarComponent.day='2026-10-08';calendarComponent.setPresentation(true);calendarComponent.setPeriod('month');
assert.equal(calendarCase.reads.at(-1).fecha,'2026-09-28');
assert.equal(calendarCase.reads.at(-1).hasta,'2026-11-09');
calendarComponent.navigatePeriod(1);
assert.equal(calendarComponent.day,'2026-11-01');
calendarComponent.calendarDay('2026-11-05');
assert.equal(calendarComponent.calendarView,'day');
assert.equal(calendarCase.reads.at(-1).hasta,'2026-11-06');
calendarComponent.setPresentation(false);
assert.equal(calendarCase.reads.at(-1).dias,'1');
const slot={cancha:10,inicio:'2099-01-01T18:00:00-04:00',fin:'2099-01-01T20:00:00-04:00'};
calendarComponent.agenda.set({zona_horaria:'America/La_Paz',canchas:[{id:10,activa:true}],horarios:[slot],reservas:[],bloqueos:[]});
calendarComponent.links=[{id:30,cancha:10,sucursal:1,minutos:60}];calendarComponent.court='10';calendarComponent.loading.set(false);
const selection=calendarUtilities.selectionDraft(slot.inicio,'2099-01-01T19:00:00-04:00');
calendarComponent.calendarSelect(selection);
assert.equal(calendarComponent.mode(),'reserve');
assert.equal(calendarComponent.draft.fecha,'2099-01-01');
assert.equal(calendarComponent.draft.hora_inicio,'18:00');
assert.equal(calendarComponent.draft.cancha_deporte,'30');
assert.equal(calendarComponent.quotation(),null);
calendarComponent.closeForm();
calendarComponent.calendarSelect(calendarUtilities.selectionDraft(slot.inicio,'2099-01-01T18:30:00-04:00'));
assert.equal(calendarComponent.mode(),'');
assert.match(calendarComponent.message(),/minima/);
calendarComponent.agenda().bloqueos=[slot];
calendarComponent.calendarSelect(selection);
assert.equal(calendarComponent.mode(),'');
assert.match(calendarComponent.message(),/no esta disponible/);
console.log('Flujo de reservas: regresion existente y 15 comprobaciones de integracion de calendario correctas, sin navegador.');

const dashboardLink=setup({nueva:'1',sucursal:'1'});
assert.equal(dashboardLink.component.mode(),'reserve');
assert.equal(dashboardLink.component.branch,'1');
assert.equal(dashboardLink.navigations.length,1);
assert.equal(dashboardLink.navigations[0][1].queryParams.nueva,null);
assert.equal(setup({nueva:'1'},false).component.mode(),'');
assert.equal(setup({sucursal:'999'}).component.branch,'1');
console.log('Accesos desde dashboard: nueva reserva, permisos y sucursal autorizada correctos.');
