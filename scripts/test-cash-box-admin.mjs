import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';
import * as rxjs from 'rxjs';

const read = path => readFileSync(new URL('../src/app/' + path, import.meta.url), 'utf8');
const signal = initial => { let value=initial; const get=()=>value; get.set=next=>{value=next;}; return get; };
let template, respond, reject;
const writes=[];
const rows=[{id:1,nombre:'Principal',sucursal_nombre:'Central',activa:true,sesion_actual:10},
  {id:2,nombre:'Recepcion',sucursal_nombre:'Norte',activa:false,sesion_actual:null},
  {id:3,nombre:'Auxiliar',sucursal_nombre:'Central',activa:true,sesion_actual:null}];
let loads=0;
const api={boxes:()=>({subscribe:observer=>{loads++;observer.next(rows);}}),
  updateBox:(id,data)=>{writes.push({id,data});return{subscribe:observer=>{respond=observer.next;reject=observer.error;}};}};
const exports={};
vm.runInNewContext(ts.transpileModule(read('features/caja/cajas-admin.component.ts'),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,
}}).outputText,{exports,require:name=>name==='@angular/core'?{
  Component:metadata=>{template=metadata.template;return value=>value;},signal,computed:fn=>fn,inject:()=>api,
}:name==='../reservas/reservas-ui'?{RESERVAS_UI:[]}:name==='../reservas/reservas.service'?{apiError:error=>error.error.detail}:new Proxy({},{get:()=>class{}})});
const page=new exports.CajasAdminComponent();
assert.equal(loads,1,'No periodic refresh');
assert.equal(page.filtered().length,3,'List contains inactive boxes');
page.query.set(' CENTRAL ');assert.deepEqual(Array.from(page.filtered(),box=>box.id),[1,3]);
page.query.set('');page.state.set('inactive');assert.deepEqual(Array.from(page.filtered(),box=>box.id),[2]);
page.state.set('active');assert.equal(page.filtered().length,2);
page.state.set('');page.query.set('inexistente');assert.equal(page.filtered().length,0);
page.query.set('');
page.askToggle(rows[0]);assert.equal(page.toggleTarget(),null);assert.match(page.error(),/turno/);
page.toggleTarget.set(rows[0]);page.toggle();assert.equal(writes.length,0,'Open box cannot be disabled in the client');
page.toggleTarget.set(null);page.edit(rows[0]);page.name='  Principal actualizada  ';page.saveName();
assert.equal(writes[0].data.nombre,'Principal actualizada');
page.saveName();assert.equal(writes.length,1,'Prevent duplicate submission');
reject({error:{detail:'Nombre duplicado'}});assert.equal(page.saving(),false);assert.equal(page.editing(),rows[0]);
assert.equal(page.formError(),'Nombre duplicado');
page.name='   ';page.saveName();assert.equal(writes.length,1);
page.name='x'.repeat(101);page.saveName();assert.equal(writes.length,1);
page.editing.set(null);page.askToggle(rows[1]);page.toggle();
assert.equal(writes.at(-1).data.activa,true);respond();assert.equal(page.toggleTarget(),null);assert.equal(loads,2);
page.askToggle(rows[2]);page.toggle();assert.equal(writes.at(-1).data.activa,false);
reject({error:{detail:'Turno abierto'}});assert.equal(page.formError(),'Turno abierto');assert.equal(page.toggleTarget(),rows[2]);
assert.equal(parseTemplate(template,'cash-admin').errors,null);
for(const component of ['app-page-header','app-list-toolbar','app-select','app-list-shell','app-badge','app-dropdown','app-modal']) assert.match(template,new RegExp('<'+component));
assert.match(template,/backRoute="\/caja"/);
assert.match(template,/\[disabled\]="saving\(\) \|\| \(box.activa && !!box.sesion_actual\)"/);
const routes=read('app.routes.ts');
assert.match(routes,/path: 'administracion-cajas'.*permission:'caja.configurar',global:true/);
assert.match(read('features/caja/caja.component.ts'),/route="\/administracion-cajas"/);
assert.match(read('shared/components/layout/sidebar/sidebar.component.ts'),/\*appCan="'caja.configurar'; global: true"/);

class Router {}
const guardExports={};let allowed=false,global=false;
const auth={me:()=>rxjs.of({}),can:(_,needsGlobal)=>allowed&&(!needsGlobal||global)};
vm.runInNewContext(ts.transpileModule(read('core/guards/permission.guard.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
  {exports:guardExports,require:name=>name==='@angular/core'?{inject:token=>token===Router?{createUrlTree:parts=>parts[0]}:auth}:name==='@angular/router'?{Router}:name==='rxjs'?rxjs:new Proxy({},{get:()=>class{}})});
for(const [permission,scope,expected] of [[false,true,'/sin-acceso'],[true,false,'/sin-acceso'],[true,true,true]]){
  allowed=permission;global=scope;let result;
  guardExports.permissionGuard({data:{permission:'caja.configurar',global:true}}).subscribe(value=>{result=value;});
  assert.equal(result,expected,'Administration requires global configuration access');
}
console.log('Cash box administration: all statuses, search, filters, name validation, activation/deactivation, open-turn protection, failed API requests, no duplicate writes and global route guard passed without browser.');
