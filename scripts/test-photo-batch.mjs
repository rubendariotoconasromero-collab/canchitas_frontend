import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';

const read = path => readFileSync(new URL('../src/app/' + path, import.meta.url), 'utf8');
const compile = source => ts.transpileModule(source, {compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true,
}}).outputText;
const signal = value => {const fn = () => value; fn.set = next => value = next; fn.update = update => value = update(value); return fn;};
let cleanup, metadata;
const events = [], revoked = [], created = [];
const core = {signal, input: signal, output: () => ({emit: value => events.push(value)}),
  ChangeDetectionStrategy: {OnPush: 0}, Component: options => {metadata = options; return value => value;},
  inject: () => ({onDestroy: fn => cleanup = fn}), DestroyRef: class {}};
const exports = {};
vm.runInNewContext(compile(read('shared/components/image-batch-picker/image-batch-picker.component.ts')), {
  exports, require: name => name === '@angular/core' ? core : new Proxy({}, {get: () => class {}}),
  URL: {createObjectURL: file => {created.push(file); return 'blob:' + created.length;}, revokeObjectURL: url => revoked.push(url)},
});
const picker = new exports.ImageBatchPickerComponent();
const file = (name, type = 'image/png', size = 100) => ({name, type, size, lastModified: 1});
const select = files => {const target = {files, value: 'chosen'}; picker.selectFiles({target}); return target;};
const first = file('vista_frontal.png');
assert.equal(select([first, file('vista-lateral.webp', 'image/webp')]).value, '');
assert.equal(picker.images().length, 2); assert.equal(events.length, 1);
assert.equal(picker.images()[0].description, 'vista frontal');
select([first]); assert.equal(picker.images().length, 2, 'Duplicates must not be added');
select([file('tercera.jpg', 'image/jpeg')]); assert.equal(picker.images().length, 3);
const before = created.length;
select([file('valida.png'), file('incorrecta.txt', 'text/plain')]);
assert.match(picker.selectionError(), /incorrecta.txt/); assert.equal(created.length, before);
assert.equal(picker.images().length, 3, 'Reject an invalid selection as a whole');
select([file('grande.jpg', 'image/jpeg', 6 * 1024 * 1024)]); assert.match(picker.selectionError(), /5 MB/);
select([file('vacia.png', 'image/png', 0)]); assert.match(picker.selectionError(), /no vacio/);
select(Array.from({length:8}, (_, i) => file('otra' + i + '.png'))); assert.match(picker.selectionError(), /10/);
select([]); assert.equal(picker.images().length, 3, 'Cancelling file selection preserves drafts');
const id = picker.images()[0].id;
picker.describe(id, 'Entrada principal'); assert.equal(events.at(-1)[0].description, 'Entrada principal');
assert.match(picker.descriptionError(' '), /descripcion/); assert.match(picker.descriptionError('a'.repeat(201)), /200/);
assert.equal(picker.descriptionError('Correcta'), '');
picker.previewFailed(id); assert.equal(picker.images()[0].previewFailed, true);
picker.disabled.set(true);
picker.remove(id); picker.describe(id, 'No cambiar'); select([file('bloqueada.png')]);
assert.equal(picker.images().length, 3); assert.equal(picker.images()[0].description, 'Entrada principal');
picker.disabled.set(false); picker.remove(id);
assert.equal(picker.images().length, 2); assert.deepEqual(revoked, ['blob:1']); assert.equal(picker.selectionError(), '');
select([first]); assert.equal(picker.images().length, 3, 'A removed file can be selected again');
cleanup(); assert.equal(revoked.length, created.length, 'All preview URLs are released on removal or destroy');
assert.equal(parseTemplate(metadata.template, 'image-batch-picker').errors, null);
assert.match(metadata.template, /\[multiple\]="true"/); assert.match(metadata.template, /app-input/);
assert.match(read('shared/components/file-input/file-input.component.ts'), /multiple = input\(false\)/);

const apiExports = {};
vm.runInNewContext(compile(read('core/utils/api-error.ts')), {exports: apiExports});
const catalogExports = {};
vm.runInNewContext(compile(read('features/catalogo/catalog-list.component.ts')), {
  exports: catalogExports, FormData,
  require: name => name === '@angular/core' ? {Component: () => value => value}
    : name.endsWith('utils/api-error') ? apiExports : new Proxy({}, {get: () => class {}}),
});
const catalog = Object.create(catalogExports.CatalogListComponent.prototype);
const controls = {archivo: {value:'', setValue(value){this.value=value;}}, publicada: {value:false}};
let observer, payload, calls = 0, loads = 0, changes = 0;
const successes = [];
Object.assign(catalog, {
  config: () => ({endpoint:'fotos', title:'Fotografias'}), fixed: () => ({cancha:7}), editingId: signal(undefined),
  form: {invalid:false, get:key => controls[key]}, batchPhotos: signal([]), opened: signal(true), saving: signal(false), error: signal(''),
  photoPreview:signal(''), photoPreviewError:signal(''), photoPreviewFailed:signal(false), previewUrl:null,
  service: {uploadPhotos: data => {payload=data; calls++; return {subscribe: next => observer=next};}},
  snackbar:{success: message => successes.push(message)}, changed:{emit: () => changes++}, load: () => loads++,
});
catalog.save(); assert.match(catalog.error(), /al menos/); assert.equal(calls, 0);
const drafts = [new File(['image'], 'a.png', {type:'image/png'}), new File(['image'], 'b.png', {type:'image/png'})]
  .map((file, id) => ({id, file, preview:'', description:'Vista '+id, previewFailed:false}));
catalog.batchChanged(drafts); assert.equal(controls.archivo.value, '2');
catalog.batchChanged([{...drafts[0], description:'   '}]); catalog.save();
assert.match(catalog.error(), /a.png/); assert.equal(calls, 0);
catalog.batchChanged(drafts); catalog.form.invalid=true; catalog.form.markAllAsTouched=()=>{}; catalog.save(); assert.equal(calls,0);
catalog.form.invalid=false; catalog.save();
assert.equal(catalog.saving(), true); catalog.save(); assert.equal(calls,1, 'Busy state prevents duplicate submits');
assert.equal(payload.get('cancha'), '7'); assert.equal(payload.get('publicada'), 'false');
assert.equal(payload.getAll('archivos').length, 2); assert.equal(payload.has('orden'), false);
assert.deepEqual(JSON.parse(payload.get('fotografias')), [{texto_alternativo:'Vista 0'}, {texto_alternativo:'Vista 1'}]);
observer.error({error:{fotografias:{'2':{imagen:'2. b.png',archivo:['Imagen invalida.']}}}});
assert.equal(catalog.saving(),false); assert.equal(catalog.opened(),true); assert.equal(catalog.batchPhotos().length,2);
assert.match(catalog.error(), /b.png/); assert.equal(loads,0); assert.equal(successes.length,0);
catalog.save(); observer.next([{id:1},{id:2}]);
assert.equal(catalog.opened(),false); assert.equal(catalog.batchPhotos().length,0);
assert.equal(loads,1); assert.equal(changes,1); assert.equal(successes.length,1); assert.match(successes[0], /2 fotografias/);
catalog.editingId.set(5); assert.equal(catalog.isBatchPhotoUpload(),false, 'Existing photographs keep single editing');
assert.match(read('features/catalogo/catalog.service.ts'), /fotos'\)\}lote\//);
console.log('Multi-photo selection, previews, descriptions, limits, removal, URL cleanup, atomic multipart submit, busy protection, errors and single editing verified without browser.');
