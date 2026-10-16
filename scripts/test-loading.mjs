import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';
import * as rxjs from 'rxjs';

const read=path=>readFileSync(new URL('../src/app/'+path,import.meta.url),'utf8');
const signal=initial=>{let value=initial;const get=()=>value;get.set=next=>value=next;get.update=fn=>value=fn(value);return get;};
const transpile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
const exports={};
vm.runInNewContext(transpile(read('core/services/loading.service.ts')),{exports,require:()=>({signal,computed:fn=>fn,Injectable:()=>value=>value})});
const loading=new exports.LoadingService();
assert.equal(loading.active(),false);
const endRead=loading.begin('GET'),endWrite=loading.begin('POST');
assert.equal(loading.pending(),2);assert.match(loading.message(),/Procesando/);
endWrite();endWrite();assert.equal(loading.pending(),1);assert.match(loading.message(),/Cargando/);
endRead();assert.equal(loading.active(),false);
const interceptorExports={};
vm.runInNewContext(transpile(read('core/interceptors/loading.interceptor.ts')),{exports:interceptorExports,
  require:name=>name==='@angular/core'?{inject:()=>loading}:name==='rxjs'?rxjs:
    name.includes('api-endpoints')?{API_BASE_URL:'/api'}:{LoadingService:class{}}});
const intercept=interceptorExports.loadingInterceptor;
function request(method='POST'){return{url:'/api/reservas/',method};}
const first=new rxjs.Subject(),second=new rxjs.Subject();
const pending=intercept(request(),()=>first);
assert.equal(loading.pending(),0,'Unsubscribed HTTP streams must not start loading');
const subscription=pending.subscribe();assert.equal(loading.pending(),1);
intercept(request('GET'),()=>second).subscribe();assert.equal(loading.pending(),2);
first.complete();assert.equal(loading.pending(),1);second.complete();assert.equal(loading.pending(),0);
intercept(request(),()=>rxjs.throwError(()=>new Error('API error'))).subscribe({error:()=>{}});
assert.equal(loading.active(),false,'Errors must release the indicator');
intercept(request(),()=>{throw new Error('Synchronous error');}).subscribe({error:()=>{}});
assert.equal(loading.active(),false,'Synchronous failures must also release it');
const canceled=intercept(request(),()=>new rxjs.Subject()).subscribe();assert.equal(loading.pending(),1);
canceled.unsubscribe();assert.equal(loading.active(),false);
pending.subscribe().unsubscribe();assert.equal(loading.pending(),0,'Repeated subscriptions cannot leak pending state');
intercept({url:'https://other.example/file',method:'GET'},()=>rxjs.of(null)).subscribe();assert.equal(loading.pending(),0);
subscription.unsubscribe();

let metadata,render;
const layer={open:false,matches(){return this.open;},showPopover(){this.open=true;},hidePopover(){this.open=false;}};
const overlayExports={};
vm.runInNewContext(transpile(read('shared/components/loading/action-loading.component.ts')),{exports:overlayExports,
  require:name=>name==='@angular/core'?{Component:options=>{metadata=options;return value=>value;},inject:()=>loading,
    viewChild:()=>()=>({nativeElement:layer}),afterRenderEffect:fn=>render=fn,ChangeDetectionStrategy:{OnPush:0}}:new Proxy({},{get:()=>class{}})});
new overlayExports.ActionLoadingComponent();render();assert.equal(layer.open,false);
const finish=loading.begin('PATCH');render();assert.equal(layer.open,true);finish();render();assert.equal(layer.open,false);
assert.equal(parseTemplate(metadata.template,'action-loading').errors,null);
assert.match(metadata.template,/popover="manual"/);
const componentExports={};
vm.runInNewContext(transpile(read('shared/components/loading/loading.component.ts')),{exports:componentExports,
  require:()=>({input:signal,Component:options=>{metadata=options;return value=>value;},ChangeDetectionStrategy:{OnPush:0}})});
const component=new componentExports.LoadingComponent();assert.equal(component.compact(),false);
assert.equal(parseTemplate(metadata.template,'loading').errors,null);
assert.match(metadata.template,/'status'/);assert.match(read('shared/components/loading/loading.component.css'),/prefers-reduced-motion/);
assert.equal((read('app.html').match(/<app-action-loading/g)||[]).length,1);
assert.match(read('app.config.ts'),/withInterceptors\(\[loadingInterceptor, authInterceptor\]\)/);
for(const path of ['shared/components/button/button.component.ts','shared/components/states/loading-state.component.ts',
  'features/dashboard/dashboard.component.ts','features/catalogo/cancha-detail.component.ts','features/reservas/agenda.component.ts'])
  assert.match(read(path),/<app-loading/,path);
console.log('Loading: concurrency, write/read labels, success/error/synchronous throw/cancellation cleanup, lazy subscriptions, external URL exclusion, global top layer, shared button/list integrations and reduced-motion support passed without browser.');
