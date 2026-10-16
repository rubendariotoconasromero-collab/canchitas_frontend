import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';

const read=path=>readFileSync(new URL('../src/app/'+path,import.meta.url),'utf8');
const signal=value=>{const fn=()=>value;fn.set=next=>value=next;fn.update=update=>value=update(value);return fn;};
const timers=[];
const serviceExports={};
const transpile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,
  target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
const bookingUtilities={};
vm.runInNewContext(transpile(read('features/reservas/agenda.utils.ts')),{exports:bookingUtilities});
vm.runInNewContext(transpile(read('core/services/snackbar.service.ts')),{exports:serviceExports,
  setTimeout:(callback,duration)=>timers.push({callback,duration}),require:()=>({signal,Injectable:()=>value=>value})});
const service=new serviceExports.SnackbarService();
service.success('Guardado');assert.equal(service.messages()[0].type,'success');assert.equal(timers[0].duration,4500);
service.error('Error');assert.equal(service.messages()[1].type,'error');
service.dismiss(service.messages()[0].id);assert.equal(service.messages().length,1);
timers[1].callback();assert.equal(service.messages().length,0);
service.success(undefined);assert.match(service.messages()[0].message,/completada/);
timers[0].callback();assert.equal(service.messages().length,1,'Expired timers cannot dismiss newer messages');

let metadata,render;
const layer={open:false,shows:0,hides:0,matches(){return this.open;},showPopover(){this.open=true;this.shows++;},hidePopover(){this.open=false;this.hides++;}};
const componentExports={};
vm.runInNewContext(transpile(read('shared/components/snackbar/snackbar.component.ts')),{exports:componentExports,
  require:name=>name==='@angular/core'?{Component:options=>{metadata=options;return value=>value;},
    inject:()=>service,viewChild:()=>()=>({nativeElement:layer}),afterRenderEffect:callback=>render=callback,
    ChangeDetectionStrategy:{OnPush:0},ViewEncapsulation:{None:0}}:{SnackbarService:class{}}});
new componentExports.SnackbarComponent();render();assert.equal(layer.shows,1);
service.success('Otro guardado');render();assert.equal(layer.shows,2);assert.equal(layer.hides,1);
service.messages.set([]);render();assert.equal(layer.open,false);
assert.equal(parseTemplate(metadata.template,'notifications').errors,null);
assert.match(metadata.template,/popover="manual"/);assert.match(metadata.template,/aria-label="Cerrar notificacion"/);
assert.match(metadata.template,/'alert' : 'status'/);
assert.equal((read('app.html').match(/<app-snackbar/g)||[]).length,1);
assert.doesNotMatch(read('layouts/main-layout/main-layout.component.ts'),/<app-snackbar/);

function prototype(path,className){
  const exports={};
  vm.runInNewContext(transpile(read(path)),{exports,require:name=>name==='@angular/core'?{Component:()=>value=>value}
    :name.includes('reservas-ui')?{RESERVAS_UI:[]}:name.includes('reservas.service')?{apiError:error=>error.detail}:name==='./agenda.utils'?bookingUtilities:new Proxy({},{get:()=>class{}})});
  return Object.create(exports[className].prototype);
}
const notices=[];let observer;
const request=()=>({subscribe:callbacks=>observer=callbacks});
const dismissed=[];
const snackbar={success:message=>notices.push(message),dismiss:id=>dismissed.push(id)};
function assertSuccess(run,response={}){
  notices.length=0;run();assert.equal(notices.length,0,'No success notification before API response');
  observer.next(response);assert.equal(notices.length,1,'One notification for one successful action');
}
const client=prototype('features/reservas/cliente-editor.component.ts','ClienteEditorComponent');
Object.assign(client,{snackbar,saving:signal(false),error:signal(''),draft:{nombre:'Ana',sucursal:1},
  client:signal(null),api:{saveClient:request},saved:{emit:()=>{}}});
assertSuccess(()=>client.save());assert.match(notices[0],/registrado/);
client.client.set({id:3});assertSuccess(()=>client.save());assert.match(notices[0],/actualizado/);
notices.length=0;client.save();observer.error({detail:'No se pudo guardar'});
assert.equal(notices.length,0,'Failed requests must not show success');assert.equal(client.error(),'No se pudo guardar');

const cash=prototype('features/caja/caja.component.ts','CajaComponent');
Object.assign(cash,{snackbar,saving:signal(false),formError:signal(''),operation:signal(''),selected:signal(null),
  api:{open:request,close:request,move:request},sessions:[],branch:'1',box:'1',
  amount:100,notes:'Ingreso',kind:'INGRESO',load:()=>{}});
// current is a getter derived from boxes and sessions.
cash.boxes=[{id:1,sesion_actual:9}];cash.sessions=[{id:9,cierre:null}];
for(const operation of ['open','close','movement']){cash.boxes[0].sesion_actual=operation==='open'?null:9;cash.operation.set(operation);assertSuccess(()=>cash.save());}

const agenda=prototype('features/reservas/agenda.component.ts','AgendaComponent');
Object.assign(agenda,{snackbar,saving:signal(false),formError:signal(''),mode:signal('reserve'),quotation:signal({total:'100'}),
  detail:signal(null),confirmation:signal(null),paymentTarget:signal(null),message:signal(''),auth:{can:()=>false},
  draft:{cancha:1,notas:'Mantenimiento'},
  api:{reserve:request,block:request,change:request,release:request},intervalData:()=>({}),bookingData:()=>({}),load:()=>{}});
for(const mode of ['reserve','block','move']){agenda.mode.set(mode);assertSuccess(()=>agenda.save(),{estado:'PENDIENTE',saldo_pendiente:'100.00'});
  if(mode==='reserve')assert.match(notices[0],/Completa el pago total/);}
agenda.mode.set('reserve');assertSuccess(()=>agenda.save(),{estado:'PENDIENTE',saldo_pendiente:'100.00'});
const pendingId=agenda.pendingPaymentNotice;
agenda.reservationPaid();assert.ok(dismissed.includes(pendingId));assert.equal(agenda.pendingPaymentNotice,undefined);
for(const state of ['CONFIRMADA','EN_CURSO','FINALIZADA','CANCELADA','EXPIRADA']){
  agenda.mode.set('reserve');assertSuccess(()=>agenda.save(),{estado:state,saldo_pendiente:'0.00'});
  assert.doesNotMatch(notices[0],/apartado temporalmente|Completa el pago/);
}
for(const kind of ['cancel','release']){agenda.confirmation.set({kind,id:1});assertSuccess(()=>agenda.confirm());}
for(const action of ['iniciar','finalizar','confirmar'])assertSuccess(()=>agenda.change({id:1},action));

for(const path of ['usuarios/usuarios','roles/roles','permisos/permisos','catalogo/catalog-list','reservas/cliente-editor','reservas/agenda','caja/caja','caja/payment-modal','caja/cajas-admin'])
  assert.match(read('features/'+path+'.component.ts'),/this.snackbar.success\(/,path);
console.log('Notifications: global single host, accessible close/status, native top-layer behavior, expiry, fallback text, successful client/cash/reservation actions and nine module integrations passed without browser.');
