import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';
import postcss from 'postcss';

const base=new URL('../src/app/',import.meta.url);
const read=path=>readFileSync(new URL(path,base),'utf8');
const signal=value=>{const fn=()=>value;fn.set=next=>value=next;return fn;};
class PublicService{} class Route{} class Router{} class Auth{} class Snackbar{} class Requests{} class Clients{}
function load(path, providers, globals={}){
  const exports={};let template;
  vm.runInNewContext(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{
    exports,Date,Intl,crypto:{randomUUID:()=>`key-${++load.key}`},history:{state:{}},...globals,
    require:name=>{
      if(name==='@angular/core')return {Component:options=>{template=options.template;return value=>value;},Injectable:()=>value=>value,inject:token=>providers.get(token),signal,computed:fn=>fn};
      if(name==='@angular/router')return {ActivatedRoute:Route,Router};
      if(name.endsWith('public.service'))return {PublicService,requestLabels:{PENDIENTE:'Pendiente',ACEPTADA:'Aceptada',RECHAZADA:'Rechazada',VENCIDA:'Vencida'}};
      if(name.endsWith('auth.service'))return {AuthService:Auth};
      if(name.endsWith('snackbar.service'))return {SnackbarService:Snackbar};
      if(name==='./solicitudes.service')return {SolicitudesService:Requests};
      if(name.endsWith('reservas.service'))return {ReservasService:Clients,apiError:e=>e.error?.detail||'Error'};
      if(name.endsWith('agenda.utils'))return {localDate:()=> '2026-10-13',hasPendingPayment:r=>r.estado==='PENDIENTE'&&Number(r.saldo_pendiente)>0};
      if(name.endsWith('reservas-ui'))return {RESERVAS_UI:[]};
      return new Proxy({},{get:()=>class{}});
    },
  });
  if(template)assert.equal(parseTemplate(template,path).errors,null);
  return exports;
}
load.key=0;
const pending=()=>{const queue=[];return {queue,call(...args){return {subscribe:observer=>queue.push({args,observer})};}};};
const of=value=>({subscribe:observer=>observer.next(value)});
const court={id:1,nombre:'Bernabeu',sucursal:{id:1,zona_horaria:'America/La_Paz'},deportes:[{id:5,nombre:'Futbol 7'}],fotos:[]};
const quotes=pending(),submissions=pending(),availability=pending(),destinations=[],notices=[],remembered=[];
const publicApi={court:()=>of(court),availability:availability.call,quote:quotes.call,submit:submissions.call,remember:r=>remembered.push(r),credential:()=>''};
const providers=new Map([[PublicService,publicApi],[Route,{snapshot:{paramMap:{get:()=> '1'}}}],[Router,{navigate:(...args)=>destinations.push(args)}],[Snackbar,{success:message=>notices.push(message)}]]);
const {PublicCourtComponent}=load('features/publico/public-court.component.ts',providers);
const page=new PublicCourtComponent();
assert.equal(page.sport,'5');assert.equal(availability.queue.length,1);
page.day='2026-10-14';page.availability();
availability.queue[0].observer.next({intervalos:[{inicio:'stale'}]});assert.equal(page.slots().length,0);
availability.queue[1].observer.next({intervalos:[]});assert.equal(page.availabilityBusy(),false);
page.availability();page.day='';page.availability();assert.equal(page.availabilityBusy(),false,'Clearing the date must release the loader');
availability.queue[2].observer.next({intervalos:[{inicio:'stale'}]});assert.equal(page.slots().length,0);
page.day='2026-10-14';
page.start='18:00';page.end='19:00';page.cotizar();
assert.equal(quotes.queue.length,1);assert.equal(quotes.queue[0].args[0].cancha_deporte,5);
page.start='19:00';page.changed(true);page.cotizar();
quotes.queue[0].observer.next({total:'100.00'});assert.equal(page.quotation(),null,'Ignore quote for previous interval');
quotes.queue[1].observer.next({total:'120.00'});assert.equal(page.quotation().total,'120.00');
page.submit();assert.equal(submissions.queue.length,0,'Consent/contact are mandatory');
page.name=' Maria ';page.phone='70123456';page.consent=true;page.submit();page.submit();
assert.equal(submissions.queue.length,1,'Prevent duplicate clicks');
const payload=submissions.queue[0].args[0];assert.equal(payload.nombre,'Maria');assert.equal(payload.total_esperado,'120.00');
assert.equal(payload.fecha,'2026-10-14');assert.equal(payload.hora_inicio,'19:00');
for(const key of ['cliente','sin_cliente','alquiler_inmediato','estado','origen'])assert.equal(key in payload,false);
submissions.queue[0].observer.error({error:{detail:'Conexion perdida'}});page.submit();
assert.equal(submissions.queue[1].args[0].clave,payload.clave,'Retry keeps the original idempotency key');
submissions.queue[1].observer.next({codigo:'request-code',token:'private-token'});
assert.deepEqual(Array.from(destinations[0][0]),['/mis-solicitudes','request-code']);
assert.equal(destinations[0][1].state.token,'private-token');assert.equal(remembered.length,1);
assert.equal(destinations[0][1].queryParams,undefined,'Never put tracking secrets in the URL');
assert.equal(notices.length,1);
page.quotation.set({total:'120.00'});page.submit();submissions.queue[2].observer.error({status:409,error:{detail:'El precio cambio'}});
assert.equal(page.quotation(),null);assert.equal(page.consent,false,'Conflicts require a new quote and consent');

const tracking=pending();providers.set(PublicService,{credential:()=> 'saved-token',track:tracking.call});
providers.set(Route,{snapshot:{paramMap:{get:()=> 'request-code'}}});
const {PublicTrackingComponent}=load('features/publico/public-tracking.component.ts',providers,{navigator:{}});
const follow=new PublicTrackingComponent();assert.equal(tracking.queue.length,1);follow.consult();assert.equal(tracking.queue.length,1);
tracking.queue[0].observer.next({estado:'PENDIENTE'});assert.equal(follow.result().estado,'PENDIENTE');
assert.equal(tracking.queue.length,1,'No automatic polling');follow.consult();assert.equal(tracking.queue.length,2);
tracking.queue[1].observer.error({error:{detail:'Seguimiento no disponible'}});assert.equal(follow.result(),null);assert.equal(follow.busy(),false);
follow.copy();assert.ok(follow.error());

const list=pending(),accept=pending(),reject=pending(),adminQuote=pending(),clients=pending();
let allowed=['solicitudes.ver','solicitudes.aceptar','solicitudes.rechazar','clientes.ver','clientes.crear','reservas.ver'];
providers.set(Auth,{can:code=>allowed.includes(code)});
providers.set(Requests,{branches:()=>of([{id:1,nombre:'Central'},{id:2,nombre:'Norte'}]),list:list.call,quote:adminQuote.call,accept:accept.call,reject:reject.call});
providers.set(Clients,{clients:clients.call});
providers.set(Route,{queryParamMap:{subscribe:fn=>{fn({get:()=>null});return {unsubscribe(){}};}}});
const {SolicitudesComponent}=load('features/reservas/solicitudes.component.ts',providers);
const admin=new SolicitudesComponent();
const rows=[{id:1,sucursal:1,estado:'PENDIENTE',nombre:'Maria',telefono:'70123456',cancha:'Bernabeu',total_cotizado:'100.00'},
  {id:2,sucursal:2,estado:'ACEPTADA',nombre:'Juan',telefono:'72123456',cancha:'La Cantera',total_cotizado:'100.00'}];
list.queue[0].observer.next(rows);admin.branch.set('1');assert.equal(admin.filtered().length,1);
admin.query.set('bern');assert.equal(admin.filtered()[0].id,1);admin.state.set('ACEPTADA');assert.equal(admin.filtered().length,0);
admin.query.set('');admin.branch.set('');admin.state.set('');assert.equal(admin.filtered().length,2);
admin.open(rows[0]);assert.equal(admin.client,'new');assert.equal(clients.queue[0].args[0],'1');
admin.open(rows[1]);clients.queue[0].observer.next([{id:99}]);assert.equal(admin.clients.length,0,'Previous branch clients cannot leak into the current modal');
admin.open(rows[0]);admin.accept();assert.equal(accept.queue.length,0,'Must requote before accepting');
admin.cotizar();admin.close();adminQuote.queue[0].observer.next({total:'100.00'});assert.equal(admin.quotation(),null);
admin.open(rows[0]);admin.cotizar();adminQuote.queue[1].observer.next({total:'150.00'});admin.accept();admin.accept();
assert.equal(accept.queue.length,1);assert.equal(accept.queue[0].args[0],1);assert.equal(accept.queue[0].args[1].total,'150.00');assert.equal(accept.queue[0].args[2],'');
accept.queue[0].observer.error({error:{detail:'Horario ocupado'}});assert.equal(admin.quotation(),null);assert.equal(admin.busy(),false);
admin.reason='No disponible';admin.reject();assert.equal(reject.queue.length,1);reject.queue[0].observer.next({});
assert.equal(admin.selected(),null);assert.equal(list.queue.length,2,'Mutation triggers one explicit reload');
allowed=['solicitudes.ver'];admin.open(rows[0]);assert.equal(admin.clientOptions.length,0);admin.cotizar();admin.accept();admin.reject();
assert.equal(adminQuote.queue.length,2);assert.equal(accept.queue.length,1);assert.equal(reject.queue.length,1);
assert.doesNotMatch(read('features/publico/public-court.component.ts')+read('features/publico/public-tracking.component.ts')+read('features/reservas/solicitudes.component.ts'),/setInterval|\b(?:timer|interval)\([^)]*\)\s*\.pipe/);
assert.match(read('core/interceptors/auth.interceptor.ts'),/req.url.startsWith\(`\$\{API_BASE_URL\}\/publico\/`\)/);
assert.match(read('app.routes.ts'),/path: 'solicitudes'.*permission:'solicitudes.ver'/);
assert.match(read('shared/components/layout/sidebar/sidebar.component.ts'),/appCan="'solicitudes.ver'"/);
for(const screen of ['public-court','public-tracking']){
  assert.match(read('features/publico/'+screen+'.component.ts'),/<section class="public-width public-page(?: public-tracking)?">/);
}
const publicStyles=postcss.parse(read('features/publico/public.css'));
const spacing=[];
publicStyles.walkRules('.public-page',rule=>{
  const padding=rule.nodes.find(node=>node.prop==='padding-block');
  spacing.push({value:padding?.value,mobile:rule.parent.type==='atrule'&&rule.parent.params==='(max-width:760px)'});
});
assert.deepEqual(spacing,[{value:'3rem 4rem',mobile:false},{value:'2rem 3rem',mobile:true}]);
assert.doesNotMatch(read('features/publico/public-home.component.ts'),/public-page/,'Vertical page padding must not affect the landing hero or its sections');
console.log('Public phase: quote invalidation/stale responses, consent, private tracking/manual refresh, idempotent retry, admin filters/permissions/client scope, conflict/reject handling and reusable templates passed without browser.');
