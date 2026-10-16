import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';
import * as rxjs from 'rxjs';

const read=path=>readFileSync(new URL('../src/app/'+path,import.meta.url),'utf8');
const transpile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
const signal=value=>{const fn=()=>value;fn.set=next=>value=next;return fn;};
const statusExports={};
vm.runInNewContext(transpile(read('features/publico/public-request-status.ts')),{exports:statusExports});
for(const [row,label] of [[{estado:'PENDIENTE'},'En revision'],[{estado:'ACEPTADA',estado_reserva:'PENDIENTE'},'Pendiente de pago'],
  [{estado:'ACEPTADA',estado_reserva:'CONFIRMADA'},'Reserva confirmada'],[{estado_publico:'EXPIRADA'},'Plazo de pago vencido'],
  [{estado_reserva:'FINALIZADA'},'Finalizada']]) assert.equal(statusExports.publicStatus(row).label,label);

class Service{} class Router{} class Notice{} class DestroyRef{}
const dateExports={};
vm.runInNewContext(transpile(read('features/reservas/agenda.utils.ts')),{exports:dateExports,Intl,Date});
class FixedDate extends Date {
  constructor(...args){super(...(args.length?args:['2026-10-13T02:30:00Z']));}
}
const pending=()=>{const calls=[];const fn=(...args)=>new rxjs.Observable(observer=>{calls.push({args,observer});});return {calls,fn};};
const lists=pending(),imports=pending(),deletions=pending(),clear=pending();
const destinations=[],notices=[];
const api={requestHistory:lists.fn,importRequest:imports.fn,removeFromHistory:deletions.fn,clearHistory:clear.fn};
const providers=new Map([[Service,api],[Router,{navigate:(...args)=>destinations.push(args)}],[Notice,{success:m=>notices.push(m)}],[DestroyRef,{}]]);
let template;const exports={};
vm.runInNewContext(transpile(read('features/publico/public-history.component.ts')),{exports,Intl,Date:FixedDate,require:name=>{
  if(name==='@angular/core')return{Component:meta=>{template=meta.template;return value=>value;},inject:t=>providers.get(t),signal,DestroyRef};
  if(name==='@angular/core/rxjs-interop')return{takeUntilDestroyed:()=>source=>source};
  if(name==='@angular/router')return{Router};
  if(name==='rxjs')return rxjs;
  if(name==='./public.service')return{PublicService:Service};
  if(name==='./public-request-status')return statusExports;
  if(name.endsWith('/snackbar.service'))return{SnackbarService:Notice};
  if(name.endsWith('reservas.service'))return{apiError:e=>e.message};
  if(name.endsWith('agenda.utils'))return dateExports;
  if(name.endsWith('reservas-ui'))return{RESERVAS_UI:[]};
  return new Proxy({},{get:()=>class{}});
}});
const page=new exports.PublicHistoryComponent();
assert.equal(lists.calls.length,1,'Single initial load, no polling');
assert.equal(page.from,'2026-10-12','Use the current business date, not the UTC day');
assert.equal(page.to,page.from,'Both initial dates use the same day');
assert.equal(lists.calls[0].args[0].desde,page.from,'Apply the displayed initial date to the first request');
assert.equal(lists.calls[0].args[0].hasta,page.to);
const row={codigo:'uuid',codigo_correlativo:'SOL-1000000',cancha_id:17,cancha_deporte_id:5,cancha_disponible:true,
  estado_publico:'EN_REVISION',total:'100.00',inicio:'2026-11-01T18:00:00Z',fin:'2026-11-01T19:00:00Z',creado_at:'2026-10-12T18:00:00Z',zona_horaria:'America/La_Paz'};
const response={count:1,page:1,page_size:25,results:[row]};
lists.calls[0].observer.next(response);assert.equal(page.loading(),false);
page.query=' SOL-1000000 ';page.state='EN_REVISION';page.apply();
assert.equal(lists.calls.at(-1).args[0].q,'SOL-1000000');assert.equal(lists.calls.at(-1).args[0].estado,'EN_REVISION');
const stale=lists.calls.at(-1);page.selectGroup('confirmadas');
assert.equal(lists.calls.at(-1).args[0].grupo,'confirmadas');assert.equal('estado' in lists.calls.at(-1).args[0],false);
stale.observer.next(response);assert.equal(page.data(),null,'Ignore old responses after changing tabs');
lists.calls.at(-1).observer.next({...response,count:0,results:[]});
page.selectGroup('invalid');assert.equal(page.group,'confirmadas');
page.from='2026-11-20';page.to='2026-10-01';const before=lists.calls.length;page.apply();assert.equal(lists.calls.length,before);
assert.match(page.error(),/periodo/);page.from='2026-10-01';page.to='2026-11-20';page.apply();
assert.equal(lists.calls.at(-1).args[0].desde,'2026-10-01');page.changeSize(50);assert.equal(lists.calls.at(-1).args[0].page_size,'50');
assert.equal(lists.calls.at(-1).args[0].hasta,'2026-11-20','Keep edited dates when changing page size');
page.from='';page.to='';page.apply();
assert.equal('desde' in lists.calls.at(-1).args[0],false,'Allow an unfiltered history after clearing dates');
assert.equal('hasta' in lists.calls.at(-1).args[0],false);
page.changeSize(3);assert.equal(page.size,50);
page.view(row);assert.deepEqual(Array.from(destinations.at(-1)[0]),['/mis-solicitudes','SOL-1000000']);
page.repeat(row);assert.deepEqual(Array.from(destinations.at(-1)[0]),['/espacios',17]);assert.equal(destinations.at(-1)[1].queryParams.deporte,'5');
const navigationCount=destinations.length;page.repeat({...row,cancha_disponible:false});assert.equal(destinations.length,navigationCount);
page.openImport();page.code=' SOL-1000000 ';page.token=' private-key ';page.add();page.add();assert.equal(imports.calls.length,1);
assert.deepEqual(Array.from(imports.calls[0].args),['SOL-1000000','private-key']);page.closeImport();assert.equal(page.importing(),true);
imports.calls[0].observer.error({message:'Clave invalida'});assert.equal(page.busy(),false);assert.equal(page.formError(),'Clave invalida');assert.equal(page.importing(),true);
page.add();imports.calls[1].observer.next(row);assert.equal(page.importing(),false);assert.equal(page.token,'');assert.equal(page.group,'todas');
assert.equal(lists.calls.at(-1).args[0].grupo,'todas');assert.equal(page.query,'');
page.askRemove(row);page.remove();page.remove();assert.equal(deletions.calls.length,1);assert.equal(deletions.calls[0].args[0],'SOL-1000000');
page.closeRemoval();assert.notEqual(page.removal(),null);deletions.calls[0].observer.next();assert.equal(page.removal(),null);assert.match(notices.at(-1),/quitada/);
page.askClear();page.remove();assert.equal(clear.calls.length,1);clear.calls[0].observer.error({message:'No disponible'});assert.equal(page.removal().all,true);
page.remove();clear.calls[1].observer.next();assert.equal(page.removal(),null);assert.match(notices.at(-1),/desvinculado/);
assert.equal(parseTemplate(template,'public-history').errors,null);
for(const component of ['app-page-header','app-tabs','app-list-toolbar','app-table','app-badge','app-dropdown','app-modal','app-pagination'])assert.match(template,new RegExp('<'+component));
assert.doesNotMatch(read('features/publico/public-history.component.ts'),/setInterval|setTimeout|\b(?:timer|interval)\(/);
assert.match(read('features/publico/public-layout.component.ts'),/routerLink="\/mis-solicitudes"[^>]*>Mis solicitudes/);
assert.match(read('app.routes.ts'),/path:'seguimiento\/:codigo'/,'Legacy links remain available');

class Http{}
const httpCalls=[];
const http={get:(url,options)=>request('GET',url,undefined,options),post:(url,body,options)=>request('POST',url,body,options),delete:(url,options)=>request('DELETE',url,undefined,options)};
function request(method,url,body,options){return new rxjs.Observable(observer=>{httpCalls.push({method,url,body,options,observer});});}
const serviceExports={};
vm.runInNewContext(transpile(read('features/publico/public.service.ts')),{exports:serviceExports,require:name=>
  name==='@angular/core'?{Injectable:()=>value=>value,inject:()=>http}:name==='@angular/common/http'?{HttpClient:Http}:name==='rxjs'?rxjs:{API_BASE_URL:'/api'}});
const service=new serviceExports.PublicService();let result;
service.requestHistory({grupo:'todas'}).subscribe(value=>result=value);
service.historyDetail('SOL-000001').subscribe();
assert.equal(httpCalls.length,1,'Share one context initialization across concurrent reads');
assert.equal(httpCalls[0].options.withCredentials,true);
httpCalls[0].observer.next({csrf:'csrf-key',acceso_hasta:'2027-01-01'});httpCalls[0].observer.complete();
assert.equal(httpCalls.length,3);httpCalls[1].observer.next(response);assert.equal(result,response);
service.submit({clave:'uuid'}).subscribe();assert.equal(httpCalls.at(-1).method,'POST');assert.equal(httpCalls.at(-1).options.headers['X-CSRFToken'],'csrf-key');
assert.equal(httpCalls.at(-1).options.withCredentials,true);
service.importRequest('SOL-000001','secret').subscribe();assert.equal(httpCalls.at(-1).body.token,'secret');assert.doesNotMatch(httpCalls.at(-1).url,/secret/);
service.clearHistory().subscribe();const clearing=httpCalls.at(-1);assert.equal(clearing.options.headers['X-CSRFToken'],'csrf-key');clearing.observer.next();
service.requestHistory({}).subscribe();assert.match(httpCalls.at(-1).url,/contexto\/$/,'Clearing must establish a new browser history');
const renewal=httpCalls.at(-1);renewal.observer.next({csrf:'new-csrf'});renewal.observer.complete();
let error;service.historyDetail('SOL-000002').subscribe({error:e=>error=e});httpCalls.at(-1).observer.error({status:403});assert.equal(error.status,403);
service.requestHistory({}).subscribe();assert.match(httpCalls.at(-1).url,/contexto\/$/,'Expired contexts reset on retry without automatic write replay');
console.log('Public history: business states, private cookie/CSRF flow, shared initialization, expired-context retry, filters/tabs/pagination, stale responses, manual refresh, imports, unlinking, legacy links and reusable controls passed without browser.');
