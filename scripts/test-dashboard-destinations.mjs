import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';
const signal=value=>{const read=()=>value;read.set=next=>value=next;return read;};
class Route{}
class Api{}
class Auth{}
function load(file,query,boxes){
  const calls=[];
  const branches=[{id:1,nombre:'Central'},{id:2,nombre:'Norte'}];
  const response=data=>({subscribe:observer=>observer.next(data)});
  const api={options:()=>response({cajas:boxes,sucursales:branches}),
    branches:()=>response(branches),sessions:box=>{calls.push(box);return response([]);},
    clients:branch=>{calls.push(branch);return response([]);}};
  const source=readFileSync(new URL('../src/app/features/'+file,import.meta.url),'utf8');
  const exports={};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText,
    {exports,Date,Intl,require:name=>{
      if(name==='@angular/core')return{Component:()=>value=>value,signal,inject:token=>token===Api?api:token===Route?{snapshot:{queryParamMap:{get:()=>query}}}:{can:()=>true}};
      if(name==='@angular/router')return{ActivatedRoute:Route};
      if(name.endsWith('caja.service'))return{CajaService:Api};
      if(name.endsWith('reservas.service'))return{ReservasService:Api,apiError:()=> 'Error'};
      if(name.endsWith('auth.service'))return{AuthService:Auth};
      if(name.endsWith('reservas-ui'))return{RESERVAS_UI:[]};
      return new Proxy({},{get:()=>class{}});
    }});
  const Type=exports.CajaComponent||exports.ClientesComponent;
  return {component:new Type(),calls};
}
const boxes=[{id:10,sucursal:1},{id:20,sucursal:2}];
let result=load('caja/caja.component.ts','2',boxes);
assert.equal(result.component.box,'20');assert.equal(result.calls[0],20);
result.component.load();assert.equal(result.component.box,'20');
result=load('caja/caja.component.ts','2',[boxes[0]]);
assert.equal(result.component.box,'');assert.equal(result.calls.length,0);
result.component.load();assert.equal(result.component.box,'');
result.component.openOperation('box');assert.equal(result.component.branch,'2');
assert.equal(result.component.operation(),'','Box creation is no longer an operational action');
result=load('caja/caja.component.ts','999',boxes);
assert.equal(result.component.box,'10');
result=load('reservas/clientes.component.ts','2',boxes);
assert.equal(result.component.branch,'2');assert.equal(result.calls[0],'2');
assert.equal(result.component.selectedBranchName,'Norte');
result=load('reservas/clientes.component.ts','999',boxes);
assert.equal(result.component.branch,'1');
const clientSource=readFileSync(new URL('../src/app/features/reservas/clientes.component.ts',import.meta.url),'utf8');
const template=clientSource.match(/template: `([\s\S]*?)`\}\)/)[1];
const parsed=parseTemplate(template,'clientes');
assert.equal(parsed.errors,null);
function findBranch(nodes){
  for(const node of nodes){
    if(node.expression?.source==='branches.length>1')return node;
    const found=findBranch(node.children||node.branches||[]);if(found)return found;
  }
}
const branchSelector=findBranch(parsed.nodes);
assert.ok(branchSelector);
const canSelect=new Function('branches',`return ${branchSelector.expression.source}`);
assert.equal(canSelect([{id:1}]),false,'Single branch must be static context');
assert.equal(canSelect([{id:1},{id:2}]),true,'Multiple authorized branches retain their selector');
assert.equal(canSelect([]),false);
console.log('Clientes: selected branch label and conditional single/multiple-branch filters validated without browser.');
console.log('Dashboard destinations: Caja and Clientes preserve authorized branches, reject unavailable selections and handle branches without boxes.');
