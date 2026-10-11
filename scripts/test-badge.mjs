import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';
const source=readFileSync(new URL('../src/app/shared/components/badge/badge.utils.ts',import.meta.url),'utf8');
const exports={};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});
const defaults={active:true,activeLabel:'Activo',inactiveLabel:'Inactivo',state:null,label:null,tone:null,icon:null};
const appearance=options=>exports.badgeAppearance({...defaults,...options});
assert.equal(appearance({}).label,'Activo');assert.equal(appearance({}).tone,'success');
assert.equal(appearance({active:false}).label,'Inactivo');assert.equal(appearance({active:false}).tone,'neutral');
assert.equal(appearance({active:false,inactiveLabel:'Borrador'}).label,'Borrador');
for(const [state,tone,label] of [
  ['PENDIENTE','warning','Pendiente de pago'],['CONFIRMADA','success','Confirmada'],
  ['EN_CURSO','info','En curso'],['FINALIZADA','neutral','Finalizada'],
  ['CANCELADA','danger','Cancelada'],['EXPIRADA','neutral','Retencion vencida'],
  ['ABIERTO','success','Abierto'],['CERRADO','neutral','Cerrado']]){
  assert.equal(appearance({state}).label,label);assert.equal(appearance({state}).tone,tone);
}
assert.equal(appearance({state:'FUTURO'}).label,'FUTURO');
assert.equal(appearance({state:'__proto__'}).tone,'neutral');
assert.equal(appearance({state:'PENDIENTE',label:'Por cobrar',tone:'danger',icon:''}).label,'Por cobrar');
assert.equal(appearance({icon:''}).icon,'');assert.equal(appearance({tone:'info'}).tone,'info');
const component=readFileSync(new URL('../src/app/shared/components/badge/badge.component.ts',import.meta.url),'utf8');
assert.match(component,/aria-hidden="true"/);
const css=readFileSync(new URL('../src/app/shared/components/badge/badge.component.css',import.meta.url),'utf8');
assert.match(css,/border-radius: 999px/);assert.match(css,/overflow-wrap: anywhere/);
for(const file of ['catalogo/catalog-list.component.ts','catalogo/business-profile.component.ts',
  'catalogo/cancha-detail.component.ts','reservas/clientes.component.ts','reservas/agenda.component.ts',
  'caja/caja.component.ts','dashboard/dashboard.component.ts','usuarios/usuarios.component.ts',
  'roles/roles.component.ts','permisos/permisos.component.ts','auth/login/login.component.ts']){
  const text=readFileSync(new URL('../src/app/features/'+file,import.meta.url),'utf8');
  assert.match(text,/<app-badge/,`${file}: missing shared badge`);
  assert.doesNotMatch(text,/class="(?:catalog-status|court-status|agenda-state)"/,`${file}: duplicated status markup`);
}
console.log('Badges: legacy compatibility, 8 states, overrides, unknown states, rounded style and 11 module integrations passed without browser.');
const detail=readFileSync(new URL('../src/app/features/catalogo/cancha-detail.component.ts',import.meta.url),'utf8');
assert.match(detail,/inactiveLabel="No publicada"/);
const template=detail.match(/template:`([\s\S]*?)`\}\)/)[1];
const parsed=parseTemplate(template,'court-detail');assert.equal(parsed.errors,null);
function findWarning(nodes){for(const node of nodes){
  if(node.expression?.source.includes("auth.can('canchas.editar')"))return node;
  const found=findWarning(node.children||node.branches||[]);if(found)return found;
}}
const warning=findWarning(parsed.nodes);assert.ok(warning);
const visible=new Function('auth','c',`return !!(${warning.expression.source})`);
assert.equal(visible({can:()=>false},{pendientes_publicacion:['Agrega una foto']}),false);
assert.equal(visible({can:()=>true},{pendientes_publicacion:['Agrega una foto']}),true);
assert.equal(visible({can:()=>true},{pendientes_publicacion:[]}),false);
console.log('Court publication: clear label and permission-based warnings validated without browser.');
