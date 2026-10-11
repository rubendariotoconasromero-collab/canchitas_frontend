import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/app/features/catalogo/catalog-list.component.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, experimentalDecorators: true}}).outputText;
const created = [], revoked = [];
const exports = {};
vm.runInNewContext(code, {
  exports,
  URL: {
    createObjectURL(file) { created.push(file); return `blob:photo-${created.length}`; },
    revokeObjectURL(url) { revoked.push(url); },
  },
  require: name => name === '@angular/core'
    ? {Component: () => target => target}
    : new Proxy({}, {get: () => class {}}),
});
const signal = initial => {
  let value = initial;
  const read = () => value;
  read.set = next => value = next;
  return read;
};
const component = Object.create(exports.CatalogListComponent.prototype);
Object.assign(component, {
  photoPreview: signal(''), photoPreviewError: signal(''), photoPreviewFailed: signal(false),
  opened: signal(true), saving: signal(false), previewUrl: null, originalPhoto: '', file: null,
});
const control = {value: '', errors: null, setValue(value) {this.value = value; this.errors = null;},
  setErrors(errors) {this.errors = errors;}, markAsTouched() {}};
component.form = {get: () => control};
const select = file => component.fileChanged({target: {files: file ? [file] : []}});
const first = {name: 'primera.png', type: 'image/png', size: 100};
select(first);
assert.equal(component.photoPreview(), 'blob:photo-1');
assert.equal(component.file, first);
select({name: 'segunda.webp', type: 'image/webp', size: 200});
assert.deepEqual(revoked, ['blob:photo-1']);
assert.equal(component.photoPreview(), 'blob:photo-2');
select({name: 'grande.jpg', type: 'image/jpeg', size: 6 * 1024 * 1024});
assert.equal(component.file, null);
assert.match(component.photoPreviewError(), /5 MB/);
assert.ok(control.errors.invalidImage);
select({name: 'archivo.txt', type: 'text/plain', size: 10});
assert.match(component.photoPreviewError(), /JPEG, PNG o WebP/);
component.originalPhoto = 'https://example.test/cancha.png';
select(null);
assert.equal(component.photoPreview(), component.originalPhoto);
assert.equal(control.errors, null);
select(first);
component.closeModal();
assert.equal(component.opened(), false);
assert.equal(component.photoPreview(), '');
assert.equal(component.file, null);
assert.deepEqual(revoked, ['blob:photo-1', 'blob:photo-2', 'blob:photo-3']);
console.log('6 casos de vista previa aprobados (sin navegador).');
