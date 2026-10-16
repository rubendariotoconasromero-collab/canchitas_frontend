import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {Subject,BehaviorSubject,of} from 'rxjs';
import {parseTemplate} from '@angular/compiler';
const base=new URL('../src/app/',import.meta.url);
const read=path=>readFileSync(new URL(path,base),'utf8');
const signal=value=>{const s=()=>value;s.set=v=>value=v;return s;};signal.required=()=>signal('');
const code=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
const config={};vm.runInNewContext(code(read('features/reportes/reportes.config.ts')),{exports:config});
const permissions=new Set(['reportes.ver','reportes.cobros','reportes.cierres','reportes.exportar','avisos.ver']);
class AuthService{} class ReportesService{} class ActivatedRoute{} class DestroyRef{} class SnackbarService{}
const calls=[],auditCalls=[],noticeCalls=[];
const api={options:()=>of({sucursales:[{id:1,nombre:'Central'}],sucursal:1,canchas:[],deportes:[],cajas:[],medios:[],operadores:[]}),
  report:(kind,params)=>{const s=new Subject();calls.push({kind,params,s});return s;},
  audit:params=>{const s=new Subject();auditCalls.push({params,s});return s;},
  notices:()=>{const s=new Subject();noticeCalls.push(s);return s;}};
const navigation=new BehaviorSubject({get:()=>null});
const dependencies=new Map([[AuthService,{can:p=>permissions.has(p)}],[ReportesService,api],[ActivatedRoute,{queryParamMap:navigation}],[DestroyRef,{onDestroy(){}}],[SnackbarService,{success(){}}]]);
function load(path){
  const exports={};let template;
  vm.runInNewContext(code(read(path)),{exports,Intl,Date,Number,Object,Set,JSON,URL,
    require:name=>{
      if(name==='@angular/core')return {Component:m=>{template=m.template;return cls=>cls;},inject:t=>dependencies.get(t),DestroyRef,signal,input:signal,computed:fn=>fn,output:()=>({emit(value){this.value=value;}}),ChangeDetectionStrategy:{OnPush:0}};
      if(name==='@angular/core/rxjs-interop')return {takeUntilDestroyed:()=>v=>v};
      if(name==='@angular/router')return {ActivatedRoute};
      if(name.endsWith('/auth.service'))return {AuthService};
      if(name.endsWith('/snackbar.service'))return {SnackbarService};
      if(name==='./reportes.config')return config;
      if(name.endsWith('/reservas-ui'))return {RESERVAS_UI:[]};
      if(name==='./reportes.service')return {ReportesService,todayInBolivia:()=> '2026-10-12',displayDate:value=>value};
      if(name.endsWith('/reservas.service'))return {apiError:e=>e.message||'Error'};
      return new Proxy({},{get:()=>class{}});
    }});
  assert.equal(parseTemplate(template,path).errors,null,path);
  return exports;
}
const {ReportesComponent}=load('features/reportes/reportes.component.ts');
const report=new ReportesComponent();
assert.equal(report.tabs.length,2);assert.equal(report.kind(),'cobros');assert.equal(calls.length,1);
report.selectType('reservas');assert.equal(report.kind(),'cobros','Unauthorized tabs are rejected');
const result={count:60,page:1,page_size:25,results:[{id:1,importe:'100.00'}],resumen:{cobrado:'100.00'},meta:{generado_en:'first',criterio:'Pagos',sucursal_nombre:'Central'}};
calls[0].s.next(result);assert.equal(report.data().count,60);
report.query.set(' Cliente ');assert.equal(calls.length,1,'Typing never refreshes data');report.apply();
assert.equal(calls.at(-1).params.q,'Cliente');assert.equal(calls.at(-1).params.page,'1');
report.load(2);assert.equal(calls.at(-1).params.page,'2');
calls[1].s.next({...result,count:999});assert.equal(report.data().count,60,'Late response is ignored');
calls.at(-1).s.next({...result,page:2});assert.equal(report.page(),2);
report.changeSize(50);assert.equal(calls.at(-1).params.page,'1');assert.equal(calls.at(-1).params.page_size,'50');
calls.at(-1).s.error(new Error('Servidor no disponible'));assert.equal(report.error(),'Servidor no disponible');assert.equal(report.data().meta.generado_en,'first','Failed refresh does not change the last successful timestamp');
const before=calls.length;report.from='2026-10-15';report.to='2026-10-12';report.apply();assert.equal(calls.length,before);
report.from=report.to='2026-10-12';report.selectType('cierres');assert.equal(calls.at(-1).kind,'cierres');assert.equal(calls.at(-1).params.medio,undefined);
report.changeBranch();assert.equal(report.data(),null);assert.equal(report.applied(),null,'Branch changes clear old financial data');
navigation.next({get:key=>({tipo:'cierres',sucursal:'1',desde:'2026-10-10',hasta:'2026-10-10'})[key]??null});assert.equal(calls.at(-1).kind,'cierres');assert.equal(calls.at(-1).params.desde,'2026-10-10','Notice navigation refreshes an already open reports page');
const {AuditoriaComponent}=load('features/reportes/auditoria.component.ts');const audit=new AuditoriaComponent();
audit.query.set('Actor');audit.apply();auditCalls[0].s.next({...result,results:[],sucursales:[]});assert.equal(audit.data(),null);
auditCalls[1].s.next({...result,results:[],sucursales:[]});assert.equal(audit.data().count,60);
const {AvisosComponent}=load('features/reportes/avisos.component.ts');const notices=new AvisosComponent();
noticeCalls[0].next({count:1,results:[],actualizado_en:'first'});assert.equal(notices.data().count,1);
assert.equal(noticeCalls.length,1);notices.open.set(true);assert.equal(noticeCalls.length,1,'Opening notices does not schedule or refresh data');
notices.load();noticeCalls[1].next({count:0,results:[],actualizado_en:'second'});assert.equal(notices.data().count,0);
const {PaginationComponent}=load('shared/components/pagination/pagination.component.ts');const pagination=new PaginationComponent();
pagination.count=()=>60;assert.equal(pagination.pages(),3);pagination.chooseSize('');assert.equal(pagination.sizeChanged.value,undefined);pagination.chooseSize('50');assert.equal(pagination.sizeChanged.value,50);
for(const file of ['reportes.component.ts','auditoria.component.ts','avisos.component.ts']){
  const source=read('features/reportes/'+file);assert.doesNotMatch(source,/setInterval|setTimeout|timer\(|interval\(|WebSocket|EventSource/);
  assert.match(source,/<app-table/);assert.match(source,/<app-list-toolbar/);
}
const routes=read('app.routes.ts');assert.match(routes,/path: 'reportes'.*permission:'reportes.ver'/);assert.match(routes,/path: 'auditoria'.*permission:'auditoria.ver',global:true/);
console.log('Phase 6: permissions, filters, pagination, stale responses, manual refresh, timestamps, reusable controls and route guards passed without browser.');
