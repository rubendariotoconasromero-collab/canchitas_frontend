import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';
const base=new URL('../src/app/',import.meta.url);
const read=path=>readFileSync(new URL(path,base),'utf8');
const transpile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
const signal=value=>{const fn=()=>value;fn.set=next=>value=next;fn.update=update=>value=update(value);return fn;};
const input=value=>signal(value);input.required=()=>signal(undefined);
const errors={};vm.runInNewContext(transpile(read('core/utils/api-error.ts')),{exports:errors});
const {apiError}=errors;
const photoError={error:{publicada:['Agrega al menos una fotografia publicada.']}};
assert.equal(apiError(photoError),'Agrega al menos una fotografia publicada.');
assert.equal(apiError({error:{archivo:['Formato invalido'],datos:{valor:['Valor repetido']}}}),'Formato invalido\nValor repetido');
assert.equal(apiError({error:['Primero','Segundo','Primero']}),'Primero\nSegundo');
assert.equal(apiError({error:{detail:'No permitido'}}),'No permitido');
assert.equal(apiError({error:'{"publicada":["Falta imagen"]}'}),'Falta imagen');
assert.equal(apiError({error:'<!DOCTYPE html><body>Debug con datos internos</body>'},'No disponible'),'No disponible');
assert.match(apiError({status:0}),/conectar/);assert.equal(apiError({error:null},'Fallback'),'Fallback');

let render,metadata;const notices=[],focus=[],scroll=[];
const element={focus:options=>focus.push(options),scrollIntoView:options=>scroll.push(options)};
const alertExports={};
vm.runInNewContext(transpile(read('shared/components/form-error/form-error.component.ts')),{exports:alertExports,
  require:name=>name==='@angular/core'?{input,Component:options=>{metadata=options;return value=>value;},ChangeDetectionStrategy:{OnPush:0},
    inject:()=>({error:message=>notices.push(message)}),viewChild:()=>()=>({nativeElement:element}),untracked:fn=>fn(),afterRenderEffect:fn=>render=fn}:{}
});
const alert=new alertExports.FormErrorComponent();
render();assert.equal(notices.length,0);
alert.message.set(apiError(photoError));render();
assert.equal(notices.length,1);assert.equal(focus.length,1);assert.equal(scroll[0].block,'center');assert.equal(scroll[0].behavior,'instant');
render();assert.equal(notices.length,1,'Rendering again must not duplicate the toast');
alert.active.set(false);alert.message.set('Otro error');render();assert.equal(notices.length,1,'Closed dialogs must not announce errors');
alert.active.set(true);render();assert.equal(notices.length,2);
alert.message.set('');render();alert.message.set('Otro error');render();assert.equal(notices.length,3,'A failed retry must be announced again');
assert.equal(parseTemplate(metadata.template,'form-error').errors,null);
assert.match(metadata.template,/role="alert"/);assert.match(metadata.template,/tabindex="-1"/);
assert.match(read('shared/components/form-error/form-error.component.css'),/font-size:14px/);

function prototype(path,name){const exports={};vm.runInNewContext(transpile(read(path)),{exports,require:importName=>{
  if(importName==='@angular/core')return {Component:()=>value=>value,ChangeDetectionStrategy:{OnPush:0},ViewEncapsulation:{None:0}};
  if(importName.endsWith('utils/api-error'))return errors;
  return new Proxy({},{get:()=>class{}});
}});return Object.create(exports[name].prototype);}
const catalog=prototype('features/catalogo/catalog-list.component.ts','CatalogListComponent');
let observer,loads=0,changes=0,successes=0;
const draft={nombre:'Bernabeu actualizado',publicada:true};
Object.assign(catalog,{config:()=>({endpoint:'canchas',title:'Canchas',fields:[{key:'nombre'},{key:'publicada'}]}),fixed:()=>({}),
  form:{invalid:false,get:key=>({value:draft[key]})},editingId:signal(7),opened:signal(true),saving:signal(false),error:signal(''),file:null,
  service:{save:()=>({subscribe:value=>observer=value})},load:()=>loads++,changed:{emit:()=>changes++},snackbar:{success:()=>successes++}});
catalog.save();assert.equal(catalog.saving(),true);observer.error(photoError);
assert.equal(catalog.saving(),false);assert.equal(catalog.opened(),true);assert.equal(catalog.error(),apiError(photoError));
assert.equal(draft.nombre,'Bernabeu actualizado');assert.equal(loads,0);assert.equal(changes,0);assert.equal(successes,0);
assert.match(read('features/catalogo/catalog-list.component.ts'),/<app-form-error \[message\]="error\(\)"/);
for(const [path,className,method,payload] of [
  ['features/roles/roles.component.ts','RolesComponent','save',{nombre:'Duplicado'}],
  ['features/permisos/permisos.component.ts','PermisosComponent','save',{nombre:'Duplicado'}],
  ['features/usuarios/usuarios.component.ts','UsuariosComponent','onSaved',{correo:'ocupado@gmail.com'}],
]) {
  const component=prototype(path,className),messages=[];
  Object.assign(component,{editingId:signal(1),saving:signal(false),showModal:signal(true),service:{actualizar:()=>({subscribe:next=>observer=next})},
    snackbar:{error:message=>messages.push(message),success:()=>successes++},load:()=>loads++});
  component[method](payload);observer.error({error:{nombre:['Este valor ya existe.'],otro:['Revisa los datos.']}});
  assert.equal(component.saving(),false);assert.equal(component.showModal(),true);assert.equal(messages[0],'Este valor ya existe.\nRevisa los datos.');
}
for(const path of ['reservas/agenda','reservas/cliente-editor','reservas/solicitudes','caja/caja','caja/cajas-admin','caja/payment-modal','publico/public-court','publico/public-tracking'])
  assert.match(read('features/'+path+'.component.ts'),/app-form-error/,path);
console.log('Validation alerts: exact court publication response, nested errors, no HTML leakage, visible focused alerts, one toast, inactive dialogs, preserved drafts and user/role/permission errors passed without browser.');
