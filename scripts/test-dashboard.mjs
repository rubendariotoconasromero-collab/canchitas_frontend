import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { parseTemplate } from '@angular/compiler';

const source = readFileSync(new URL('../src/app/features/dashboard/dashboard.component.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS, experimentalDecorators:true}}).outputText;
const signal = value => {const read=()=>value; read.set=next=>value=next;return read;};
class Api {}
class Cash {}
class Auth {}
class Branding {}
const reads=[], receipts=[];
const api={summary:branch=>({subscribe:observer=>reads.push({branch,observer})})};
const cash={receipt:id=>({subscribe:observer=>receipts.push({id,observer})})};
const mocks={
  '@angular/core':{Component:()=>value=>value,signal,inject:token=>token===Api?api:token===Cash?cash:token===Auth?{can:()=>true}:{name:()=> 'Soccer Real Madrid'}},
  './dashboard.service':{DashboardService:Api},
  '../../core/services/branding.service':{BrandingService:Branding},
  '../../core/services/auth.service':{AuthService:Auth},
  '../../shared/components/metric-card/metric-card.component':{MetricCardComponent:class{}},
  '../reservas/reservas-ui':{RESERVAS_UI:[]},
  '../caja/caja.service':{CajaService:Cash},
  '../caja/receipt.component':{ReceiptComponent:class{}},
  '../reservas/reservas.service':{apiError:e=>e.error.detail},
};
const exports={};
vm.runInNewContext(code,{exports,Date,Intl,require:name=>{
  assert.ok(name in mocks,`Unexpected dependency ${name}`);return mocks[name];
}});
const component=new exports.DashboardComponent();
assert.equal(reads.length,1);
assert.equal(component.loading(),true);
const data={perfil:'cajero',sucursal:{id:1,nombre:'Central',zona_horaria:'America/La_Paz',fecha:'2026-10-11'},sucursales:[{id:1,nombre:'Central'}]};
reads[0].observer.next(data);
assert.equal(component.heading,'Resumen de caja');
assert.equal(component.branch,'1');
assert.equal(component.loading(),false);
assert.equal(component.branchOptions[0].value,'1');
component.load();
component.branch='2';component.load();
reads[1].observer.next({...data,perfil:'administrador'});
assert.equal(component.data(),null,'Stale responses must not replace current branch');
reads[2].observer.next({...data,perfil:'recepcion',sucursal:{...data.sucursal,id:2}});
assert.equal(component.heading,'Resumen de recepcion');
assert.equal(component.branch,'2');
component.load();reads[3].observer.error({error:{detail:'Sin acceso'}});
assert.equal(component.loading(),false);
assert.equal(component.error(),'Sin acceso');
component.showReceipt(12);component.showReceipt(13);
assert.equal(receipts.length,1,'Repeated clicks cannot trigger duplicate receipt requests');
receipts[0].observer.next({numero:'SRM-00000012'});
assert.equal(component.receipt().numero,'SRM-00000012');
assert.equal(component.receiptLoading(),false);
assert.match(component.money('123.50'),/123[,.]50/);
assert.equal(component.state('PENDIENTE'),'Pendiente de pago');
assert.doesNotMatch(source,/setInterval|\binterval\(|setTimeout|window\.addEventListener/,'No automatic reloads');
component.showReceipt(20);
component.load();
receipts[1].observer.next({numero:'OLD-BRANCH'});
assert.equal(component.receipt(),null,'Branch changes discard pending receipts from the previous summary');

const template=source.match(/template: `([\s\S]*?)`,\s*\}\)/)[1];
const parsed=parseTemplate(template,'dashboard');
assert.equal(parsed.errors,null);
function find(nodes,predicate){
  for(const node of nodes){if(predicate(node))return node;
    const result=find(node.children||node.branches||[],predicate);if(result)return result;
  }
}
const nav=find(parsed.nodes,node=>node.name==='nav');
const routeSource=readFileSync(new URL('../src/app/app.routes.ts',import.meta.url),'utf8');
const routeExports={};
vm.runInNewContext(ts.transpileModule(routeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
  {exports:routeExports,require:()=>new Proxy({},{get:()=>class{}})});
const routes=routeExports.routes.find(route=>route.canActivateChild).children;
for(const [profile,permissions,expected] of [
  ['administrador',['caja.ver','reservas.ver','reservas.crear','clientes.ver','usuarios.ver'],['/caja','/agenda','/agenda','/clientes','/usuarios']],
  ['recepcion',['caja.ver','reservas.ver','reservas.crear','clientes.ver'],['/caja','/agenda','/agenda','/clientes']],
  ['cajero',['caja.ver','reservas.ver','clientes.ver'],['/caja','/agenda','/clientes']],
  ['consulta',[],[]],
  ['crear-sin-leer',['reservas.crear'],[]],
]){
  const auth={can:permission=>permissions.includes(permission)};
  const links=[];
  for(const block of nav.children){
    for(const branch of block.branches||[]){
      if(new Function('auth',`return ${branch.expression.source}`)(auth))links.push(...branch.children);
    }
  }
  assert.deepEqual(links.map(link=>link.attributes.find(a=>a.name==='route').value),expected,profile);
  for(const link of links){
    const path=link.attributes.find(a=>a.name==='route').value;
    const route=routes.find(route=>'/'+route.path===path);
    assert.ok(route,`Missing route: ${path}`);
    assert.ok(auth.can(route.data.permission),`${profile}: forbidden destination ${path}`);
    if(['/caja','/agenda','/clientes'].includes(path)){
      const params=link.inputs.find(input=>input.name==='queryParams');
      assert.ok(params?.value.source.includes('sucursal:branch'),`${path}: lost selected branch`);
    }
  }
}
console.log('Dashboard: initial/manual loads, role headings, branch changes, stale responses, errors, receipts and formatting passed.');
console.log('Dashboard navigation: actual Angular template and route permissions validated for administrator, reception, cashier and restricted roles.');
