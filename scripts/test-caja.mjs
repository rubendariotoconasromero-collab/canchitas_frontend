import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports = {};
const source = readFileSync(new URL('../src/app/features/caja/payment-modal.component.ts',import.meta.url),'utf8');
const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
vm.runInNewContext(code,{exports,Date,crypto:{randomUUID:()=> 'next-key'},require:name=>name==='@angular/core'?{Component:()=>value=>value}:name.includes('reservas-ui')?{RESERVAS_UI:[]}:name.includes('reservas.service')?{apiError:()=> 'Error de conexion'}:new Proxy({},{get:()=>class{}})});
const signal = value => {const read=()=>value;read.set=next=>value=next;return read;};
const modal=Object.create(exports.PaymentModalComponent.prototype);
const r={id:1,total:'100.00',detalle:{inicio:'2099-01-01T00:00:00Z',fin:'2099-01-01T01:00:00Z'}};
const writes=[];let fail=true;let closes=0,payments=0;
Object.assign(modal,{reservation:signal(r),busy:signal(false),error:signal(''),receipt:signal(null),
  methods:[{id:1,efectivo:true},{id:2,efectivo:false}],medium:'1',session:'5',received:120,
  reference:'',verified:false,startService:false,key:'same-key',auth:{can:()=>true},
  closed:{emit:()=>closes++},paid:{emit:()=>payments++},
  api:{charge:data=>{writes.push(data);return{subscribe:observer=>fail?observer.error({}):observer.next({id:7})};}}});
assert.equal(modal.change,'20.00');
assert.equal(modal.canStart,false);
modal.pay();assert.equal(writes[0].clave,'same-key');assert.equal(modal.busy(),false);assert.equal(modal.key,'same-key');assert.equal(payments,0);
fail=false;modal.pay();assert.equal(writes[1].clave,'same-key');assert.equal(payments,1);assert.equal(closes,1);assert.equal(modal.receipt().id,7);
modal.busy.set(true);modal.pay();assert.equal(writes.length,2);modal.close();assert.equal(closes,1);
modal.busy.set(false);modal.medium='2';modal.methodChanged();assert.equal(modal.received,100);assert.equal(modal.verified,false);assert.equal(modal.key,'next-key');
modal.reference='QR-123';modal.verified=true;modal.pay();assert.equal(writes.at(-1).recibido,'100.00');assert.equal(writes.at(-1).referencia,'QR-123');assert.equal(writes.at(-1).verificado,true);
console.log('18 comprobaciones de cobro en frontend aprobadas, sin navegador.');
