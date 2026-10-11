import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/app/features/catalogo/court-dimensions.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { dimensionsValidator, formatArea, formatDimensions } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
const validate = (width, length) => dimensionsValidator({
  get: key => ({ value: key === 'ancho_metros' ? width : length }),
});

assert.equal(validate('', ''), null);
assert.equal(validate(null, null), null);
assert.equal(validate('20.50', '40.00'), null);
assert.equal(validate('0.01', '0.01'), null);
assert.equal(validate('99999.99', '99999.99'), null);
for (const pair of [[20, ''], [null, 40], [0, 40], [-1, 40], ['1.234', 40], [100000, 40], ['texto', 40], [Infinity, 40]]) {
  assert.ok(validate(...pair)?.dimensions, `Invalid dimensions accepted: ${pair}`);
}
assert.equal(formatDimensions(null, null), 'Sin registrar');
assert.equal(formatArea(null), 'Sin registrar');
assert.equal(formatArea('820.0000'), '820,00 m\u00b2');
assert.equal(formatDimensions('20.50', '40.00'), '20,50 \u00d7 40,00 m');
console.log('18 comprobaciones de dimensiones aprobadas (sin navegador).');
