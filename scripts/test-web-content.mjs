import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';
const base=new URL('../src/app/',import.meta.url);
const read=path=>readFileSync(new URL(path,base),'utf8');
const signal=value=>{const fn=()=>value;fn.set=next=>value=next;fn.update=update=>value=update(value);return fn;};
const input=value=>signal(value);input.required=()=>signal(undefined);
let template,callbacks=[];
const apiErrors={};
vm.runInNewContext(ts.transpileModule(read('core/utils/api-error.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:apiErrors});
function load(path){const exports={};vm.runInNewContext(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{
  exports,require:name=>name==='@angular/core'?{Component:options=>{template=options.template;return value=>value;},ChangeDetectionStrategy:{OnPush:0},signal,input,computed:fn=>fn,effect:fn=>callbacks.push(fn)}:name.endsWith('utils/api-error')?apiErrors:new Proxy({},{get:()=>class{}}),
});assert.equal(parseTemplate(template,path).errors,null);return exports;}
const {PublicSliderComponent}=load('features/publico/public-slider.component.ts');
const slider=new PublicSliderComponent();
assert.equal(slider.current(),undefined);slider.move(1);assert.equal(slider.index(),0);
slider.slides.set([{id:1},{id:2},{id:3}]);callbacks.forEach(fn=>fn());
slider.move(-1);assert.equal(slider.index(),2);slider.move(1);assert.equal(slider.index(),0);
slider.select(2);assert.equal(slider.current().id,3);slider.select(4);assert.equal(slider.index(),2);slider.select(-1);assert.equal(slider.index(),2);
let prevented=0;slider.key({target:{tagName:'SECTION'},key:'ArrowLeft',preventDefault:()=>prevented++});assert.equal(slider.index(),1);
slider.key({target:{tagName:'BUTTON'},key:'ArrowRight',preventDefault:()=>prevented++});assert.equal(slider.index(),1);assert.equal(prevented,1);
slider.slides.set([{id:4}]);callbacks.forEach(fn=>fn());assert.equal(slider.index(),0);assert.equal(slider.current().id,4);
assert.doesNotMatch(read('features/publico/public-slider.component.ts'),/setInterval|setTimeout|interval\(/);
assert.match(template,/aria-label="Imagen anterior"/);assert.match(template,/aria-live="polite"/);

const {CatalogListComponent}=load('features/catalogo/catalog-list.component.ts');
const list=Object.create(CatalogListComponent.prototype),requests=[],moves=[],notices=[];
Object.assign(list,{loadVersion:0,rows:signal([]),loading:signal(false),loadError:signal(''),movingPhoto:signal(false),photoOrderError:signal(''),
  config:()=>({endpoint:'slides-web',permission:'contenido_web',global:true}),fixed:()=>({}),auth:{can:()=>true},
  service:{list:()=>({subscribe:observer=>requests.push(observer)}),move:(...args)=>({subscribe:observer=>moves.push({args,observer})})},
  snackbar:{success:message=>notices.push(message)},changed:{emit:()=>{}}});
list.load();list.load();requests[0].next([{id:99}]);assert.equal(list.rows().length,0);
requests[1].next([{id:1},{id:2}]);assert.equal(list.rows()[0].id,1);
list.moveItem(list.rows()[0],'subir');assert.equal(moves.length,0,'Boundary move is ignored');
list.moveItem(list.rows()[0],'bajar');list.moveItem(list.rows()[0],'bajar');assert.equal(moves.length,1,'No duplicate ordering requests');
assert.deepEqual(Array.from(moves[0].args),['slides-web',1,'bajar']);moves[0].observer.next([]);assert.equal(list.movingPhoto(),false);assert.equal(notices.length,1);
requests[2].error({error:{detail:'No disponible'}});assert.equal(list.loading(),false);assert.match(list.loadError(),/No disponible/);

const theme=read('features/publico/public-layout.css');assert.match(theme,/\.public-site\s*\{[^}]*--button-primary-color:#d4ea16/);assert.doesNotMatch(theme,/:root/);
assert.match(read('features/contenido-web/content-web.component.ts'),/app-catalog-list/);
assert.match(read('app.routes.ts'),/permission:'contenido_web.ver',global:true/);
const config=read('features/contenido-web/content.config.ts');assert.doesNotMatch(config,/key:'orden'/);
const home=read('features/publico/public-home.component.ts');assert.match(home,/section\.contenido/);assert.doesNotMatch(home,/innerHTML/);
console.log('Web content: slider controls, keyboard, manual navigation, stale list responses, ordered actions, scoped theme, reusable admin forms and routes passed without browser.');
