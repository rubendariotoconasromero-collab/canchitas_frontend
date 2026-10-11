import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/app/shared/components/dropdown/dropdown-position.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports });
const position = exports.dropdownPosition;
const trigger = { left: 400, right: 508, top: 100, bottom: 134 };

assert.equal(position(trigger, 180, 150, 1000, 800, 'end').left, 328);
assert.equal(position(trigger, 180, 150, 1000, 800, 'start').left, 400);
assert.equal(position(trigger, 180, 150, 1000, 800, 'end').top, 138);
const nearBottom = { ...trigger, top: 700, bottom: 734 };
assert.equal(position(nearBottom, 180, 150, 1000, 800, 'end').top, 546);
const nearLeft = { left: 10, right: 118, top: 100, bottom: 134 };
assert.equal(position(nearLeft, 180, 150, 1000, 800, 'end').left, 8);
const nearRight = { left: 930, right: 1038, top: 100, bottom: 134 };
assert.equal(position(nearRight, 180, 150, 1000, 800, 'start').left, 812);
const tall = position(trigger, 180, 1000, 1000, 400, 'end');
assert.equal(tall.maxHeight, 254);
assert.equal(tall.top, 138);
console.log('8 comprobaciones de posicionamiento del dropdown aprobadas, sin navegador.');
