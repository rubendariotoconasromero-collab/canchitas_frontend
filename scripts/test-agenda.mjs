import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/app/features/reservas/agenda.utils.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
const exports = {};
vm.runInNewContext(code, {exports, Date, Intl});
const {freeIntervals, shiftDay, localDate} = exports;
const span = (a,b) => ({inicio:`2026-10-10T${a}:00Z`,fin:`2026-10-10T${b}:00Z`});
const plain = value => JSON.parse(JSON.stringify(value));
assert.deepEqual(plain(freeIntervals([span('10:00','14:00')],[span('11:00','12:00')],0)),
  [{inicio:'2026-10-10T10:00:00.000Z',fin:'2026-10-10T11:00:00.000Z'},
   {inicio:'2026-10-10T12:00:00.000Z',fin:'2026-10-10T14:00:00.000Z'}]);
assert.equal(freeIntervals([span('10:00','11:00')],[span('09:00','12:00')],0).length,0);
assert.equal(freeIntervals([span('10:00','12:00')],[span('12:00','13:00')],0).length,1);
assert.equal(freeIntervals([span('10:00','12:00'),span('11:00','14:00')],[],0).length,1);
assert.equal(freeIntervals([span('10:00','12:00')],[],Date.parse('2026-10-10T13:00:00Z')).length,0);
assert.equal(freeIntervals([span('10:00','12:00')],[],Date.parse('2026-10-10T11:00:00Z'))[0].inicio,'2026-10-10T11:00:00.000Z');
assert.equal(shiftDay('2026-12-31',1),'2027-01-01');
assert.equal(shiftDay('2026-11-01',-1),'2026-10-31');
assert.equal(localDate(new Date('2026-10-10T02:00:00Z'),'America/La_Paz'),'2026-10-09');
console.log('Agenda: 9 comprobaciones correctas, sin navegador.');
