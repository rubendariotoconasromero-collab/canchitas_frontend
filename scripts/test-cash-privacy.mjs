import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';

const source=readFileSync(new URL('../src/app/features/caja/caja.component.ts',import.meta.url),'utf8');
const signal=value=>{const fn=()=>value;fn.set=next=>value=next;return fn;};
let metadata;const exports={};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,
  target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports,require:name=>
  name==='@angular/core'?{Component:options=>{metadata=options;return value=>value;}}:
  name.endsWith('reservas-ui')?{RESERVAS_UI:[]}:
  name.endsWith('reservas.service')?{apiError:e=>e.message}:new Proxy({},{get:()=>class{}})});
const page=Object.create(exports.CajaComponent.prototype);
const calls=[];const pending=[];
const request=(kind,id)=>{calls.push({kind,id});return{subscribe:o=>pending.push(o)};};
Object.assign(page,{boxes:[{id:1,sesion_actual:11}],box:'1',sessions:[],movements:[],receipts:[],
  detailSequence:0,sequence:0,detailsLoading:signal(false),loading:signal(false),saving:signal(false),
  error:signal(''),formError:signal(''),selected:signal(null),operation:signal(''),
  auth:{can:()=>true,user:()=>({id:1,alcance_global:false})},
  api:{sessions:id=>request('sessions',id),movements:id=>request('movements',id),receipts:id=>request('receipts',id)}});
page.loadSessions();pending.shift().next([]);
assert.equal(page.current,null);assert.equal(page.occupied,true);
assert.deepEqual(calls.map(c=>c.kind),['sessions','receipts'],'Foreign open turn loads only authorized receipts, not financial movements');
pending.shift().next([{id:8}]);assert.equal(page.receipts[0].id,8);assert.equal(page.detailsLoading(),false);
for(const action of ['box','open','close','movement']){page.openOperation(action);assert.equal(page.operation(),'','No operations available on a foreign occupied box');}
const own={id:22,responsable:1,cierre:null,resumen:{esperado:'70'}};
page.boxes.push({id:2,sesion_actual:22});page.box='2';page.sessions=[own];
page.openOperation('close');assert.equal(page.operation(),'close');assert.equal(page.amount,70);
page.openOperation('movement');assert.equal(page.operation(),'movement');
page.loadDetails(own);assert.deepEqual(calls.slice(-2).map(c=>c.kind),['movements','receipts']);
const staleMovement=pending.shift(),staleReceipt=pending.shift();
page.box='1';page.sessions=[];page.loadDetails(null);
staleMovement.next([{id:90}]);staleReceipt.next([{id:99}]);
assert.equal(page.movements.length,0);assert.equal(page.receipts.length,0,'Old turn data must not appear under a newly selected box');
pending.shift().next([{id:8}]);assert.equal(page.receipts[0].id,8);
page.boxes[0].sesion_actual=null;page.openOperation('open');assert.equal(page.operation(),'open');
page.loadDetails(null);assert.equal(page.receipts.length,0);assert.equal(page.detailsLoading(),false);
assert.equal(parseTemplate(metadata.template,'cash-privacy').errors,null);
assert.match(metadata.template,/otro operador/);
assert.match(metadata.template,/auth.can\('caja.abrir'\)&&box&&!occupied/);
assert.doesNotMatch(metadata.template,/Nueva caja/);
console.log('Cash privacy: occupied boxes, own-turn actions, authorized receipts without foreign movement queries, stale response protection and reusable template validated without browser.');
