import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports = {};
const source = readFileSync(new URL('../src/app/features/caja/payment-modal.component.ts',import.meta.url),'utf8');
const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
let ids = 0;
vm.runInNewContext(code,{exports,Date,crypto:{randomUUID:()=>`key-${++ids}`},
  require:name=>name==='@angular/core'?{Component:()=>value=>value}:name.includes('reservas-ui')?{RESERVAS_UI:[]}:name.includes('reservas.service')?{apiError:()=> 'Error de conexion'}:new Proxy({},{get:()=>class{}})});
const signal = value => {const read=()=>value;read.set=next=>value=next;return read;};
const modal=Object.create(exports.PaymentModalComponent.prototype);
const reservation={id:1,total:'100.00',sucursal:3,detalle:{inicio:'2099-01-01T00:00:00Z',fin:'2099-01-01T01:00:00Z'}};
const writes=[];let fail=true;let closes=0,payments=0;
Object.assign(modal,{reservation:signal(reservation),busy:signal(false),error:signal(''),receipt:signal(null),
  snackbar:{success:()=>{}},
  methods:[{id:1,efectivo:true},{id:2,efectivo:false}],
  session:'5',startService:false,key:'same-key',boxes:[],lines:[],auth:{can:()=>true},
  closed:{emit:()=>closes++},paid:{emit:()=>payments++},
  api:{charge:data=>{writes.push(data);return{subscribe:observer=>fail?observer.error({}):observer.next({id:7})};}}});
const cash=(importe,recibido=importe)=>Object.assign(modal.newLine('1',importe),{recibido});
const transfer=(importe,referencia='QR-123',verificado=true)=>Object.assign(modal.newLine('2',importe),{referencia,verificado});

modal.lines=[cash(100)];
assert.equal(modal.remainingCents,0);assert.equal(modal.validBreakdown,true);
assert.equal(modal.change(modal.lines[0]),0);
modal.lines[0].recibido=120;assert.equal(modal.change(modal.lines[0]),20);
assert.equal(modal.money(modal.change(modal.lines[0])),'20.00');

modal.lines[0].recibido=99;assert.equal(modal.validBreakdown,false);modal.pay();assert.equal(writes.length,0);
modal.lines[0].recibido=NaN;assert.equal(modal.validBreakdown,false);modal.pay();assert.equal(writes.length,0);
modal.lines[0].recibido=120;

modal.session='';modal.pay();assert.equal(writes.length,0);modal.session='5';

modal.pay();
assert.equal(writes.length,1);assert.equal(writes[0].clave,'same-key');assert.equal(writes[0].importe,'100.00');
assert.equal(writes[0].pagos.length,1);
assert.deepEqual(Array.from(writes[0].pagos,p=>[p.medio,p.importe,p.recibido,p.referencia,p.verificado]),[[1,'100.00','120.00','',false]]);
assert.equal(modal.busy(),false);assert.equal(modal.key,'same-key');
assert.equal(payments,0);assert.equal(closes,0);assert.equal(modal.error(),'Error de conexion');

fail=false;modal.pay();
assert.equal(writes.length,2);assert.equal(writes[1].clave,'same-key');
assert.equal(payments,1);assert.equal(closes,1);assert.equal(modal.receipt().id,7);assert.equal(modal.busy(),false);

modal.busy.set(true);modal.pay();assert.equal(writes.length,2);modal.close();assert.equal(closes,1);
modal.busy.set(false);modal.close();assert.equal(closes,2);

modal.receipt.set(null);modal.lines=[cash(60,60),transfer(40)];
assert.equal(modal.remainingCents,0);assert.equal(modal.validBreakdown,true);
modal.pay();
assert.deepEqual(Array.from(writes.at(-1).pagos,p=>[p.medio,p.importe,p.recibido,p.referencia,p.verificado]),
  [[1,'60.00','60.00','',false],[2,'40.00','40.00','QR-123',true]]);

modal.lines=[transfer(100,'   ',false)];assert.equal(modal.validBreakdown,false);
modal.lines[0].referencia='QR-123';assert.equal(modal.validBreakdown,false);
modal.lines[0].verificado=true;assert.equal(modal.validBreakdown,true);
assert.equal(modal.isCash(modal.lines[0]),false);

modal.lines[0].recibido=90;modal.lines[0].medio='1';
const previousKey=modal.key;modal.methodChanged(modal.lines[0]);
assert.equal(modal.lines[0].recibido,100);assert.equal(modal.lines[0].referencia,'');
assert.equal(modal.lines[0].verificado,false);assert.notEqual(modal.key,previousKey);

modal.lines=[cash(60)];modal.addLine();
assert.equal(modal.lines.length,2);assert.equal(modal.lines[1].importe,40);assert.equal(modal.remainingCents,0);
const firstId=modal.lines[0].id;
modal.lines[0].importe=70;modal.amountChanged(modal.lines[0]);
assert.equal(modal.lines[1].importe,30);assert.equal(modal.remainingCents,0);
modal.removeLine(firstId);assert.equal(modal.lines.length,1);assert.equal(modal.lines[0].importe,100);
modal.removeLine(modal.lines[0].id);assert.equal(modal.lines.length,1);

const now=Date.now();
modal.reservation.set({...reservation,detalle:{inicio:new Date(now-3600000).toISOString(),fin:new Date(now+3600000).toISOString()}});
assert.equal(modal.canStart,true);
modal.lines=[cash(100,100)];modal.startService=true;modal.pay();
assert.equal(writes.at(-1).iniciar,true);
modal.auth={can:()=>false};assert.equal(modal.canStart,false);

console.log('Cobros: total exacto, efectivo insuficiente/no numerico, caja obligatoria, clave de idempotencia, pago mixto, transferencia verificada, reequilibrio de lineas y ventana de inicio correctos, sin navegador.');
