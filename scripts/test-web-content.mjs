import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';
const base=new URL('../src/app/',import.meta.url);
const read=path=>readFileSync(new URL(path,base),'utf8');
const signal=value=>{const fn=()=>value;fn.set=next=>value=next;fn.update=update=>value=update(value);return fn;};
const input=value=>signal(value);input.required=()=>signal(undefined);
let template,callbacks=[],scrolled=[];
const apiErrors={};
vm.runInNewContext(ts.transpileModule(read('core/utils/api-error.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:apiErrors});
function load(path){const exports={};vm.runInNewContext(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{
  exports,document:{getElementById:id=>({scrollIntoView:options=>scrolled.push({id,options})})},require:name=>name==='@angular/core'?{Component:options=>{template=options.template;return value=>value;},ChangeDetectionStrategy:{OnPush:0},signal,input,computed:fn=>fn,effect:fn=>callbacks.push(fn)}:name.endsWith('utils/api-error')?apiErrors:new Proxy({},{get:()=>class{}}),
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
assert.match(template,/slide\.destino==='CANCHAS' && showCourts\(\)/);
assert.match(template,/slide\.destino==='CONTACTO' && showContact\(\)/);assert.match(template,/logo\(\)/);

const {PublicLayoutComponent}=load('features/publico/public-layout.component.ts');
const layout=Object.create(PublicLayoutComponent.prototype);layout.menuOpen=signal(true);
let focused=0;layout.closeMenu({focus:()=>focused++});assert.equal(layout.menuOpen(),false);assert.equal(focused,1);
layout.menuOpen.set(true);layout.goToSection('canchas');assert.equal(layout.menuOpen(),false);assert.equal(scrolled[0].id,'canchas');
assert.match(template,/aria-expanded/);assert.match(template,/keydown\.escape/);
assert.match(template,/fragment="canchas"/);assert.match(template,/fragment="deportes"/);assert.match(template,/fragment="contacto"/);
assert.match(template,/mostrar_canchas/);assert.match(template,/mostrar_deportes/);assert.match(template,/mostrar_contacto/);

let fragmentListener,renderCallback,businessRequest,courtsRequest;
const availableTargets=new Set(),homeScroll=[];
const homeApi={business:()=>({subscribe:observer=>businessRequest=observer}),courts:()=>({subscribe:observer=>courtsRequest=observer})};
const route={fragment:{pipe:()=>({subscribe:listener=>{fragmentListener=listener;listener('deportes');}})}};
const injections=[homeApi,{name:()=> 'Soccer Real Madrid'},route,{}];
const homeExports={};
vm.runInNewContext(ts.transpileModule(read('features/publico/public-home.component.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{
  exports:homeExports,document:{getElementById:id=>availableTargets.has(id)?{scrollIntoView:()=>homeScroll.push(id)}:null},
  require:name=>name==='@angular/core'?{Component:options=>{assert.equal(parseTemplate(options.template,'public-home').errors,null);return value=>value;},signal,computed:fn=>fn,inject:()=>injections.shift(),afterEveryRender:fn=>renderCallback=fn}:
    name==='@angular/core/rxjs-interop'?{takeUntilDestroyed:()=>null}:name.endsWith('/reservas-ui')?{RESERVAS_UI:[]}:new Proxy({},{get:()=>class{}}),
});
const homeComponent=new homeExports.PublicHomeComponent();renderCallback();assert.equal(homeScroll.length,0);
businessRequest.next({nombre:'Soccer Real Madrid',descripcion:'',sucursales:[],web:{slides:[]}});
availableTargets.add('deportes');renderCallback();renderCallback();assert.deepEqual(homeScroll,['deportes']);
courtsRequest.next([]);availableTargets.add('contacto');fragmentListener('contacto');renderCallback();assert.deepEqual(homeScroll,['deportes','contacto']);
fragmentListener('desconocido');renderCallback();assert.equal(homeScroll.length,2);
homeComponent.business.set({nombre:'Soccer Real Madrid',descripcion:'',portada:'/portada.jpg',sucursales:[],web:{slides:[],mostrar_canchas:false}});
assert.equal(homeComponent.heroSlides()[0].texto_boton,'');assert.equal(homeComponent.heroSlides()[0].alt,'Soccer Real Madrid');
homeComponent.business().web.mostrar_canchas=true;assert.equal(homeComponent.heroSlides()[0].texto_boton,'Ver canchas');

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

const theme=read('features/publico/public-layout.css');assert.match(theme,/\.public-site\s*\{[^}]*--button-primary-color:#ffcf24/);assert.doesNotMatch(theme,/:root/);
assert.match(theme,/@media\(max-width:1000px\)/);assert.match(theme,/\.public-nav-links\.is-open/);
const sliderCss=read('features/publico/public-slider.css');assert.match(sliderCss,/@media\(max-width:760px\)/);assert.match(sliderCss,/width:44px; height:44px/);
const publicCss=read('features/publico/public.css');assert.match(publicCss,/\.public-court-grid,\.public-detail-grid,\.public-locations\s*\{\s*grid-template-columns:\s*1fr/);assert.match(publicCss,/@media\(max-width:420px\)/);
assert.match(read('features/contenido-web/content-web.component.ts'),/app-catalog-list/);
assert.match(read('app.routes.ts'),/permission:'contenido_web.ver',global:true/);
const config=read('features/contenido-web/content.config.ts');assert.doesNotMatch(config,/key:'orden'/);
const home=read('features/publico/public-home.component.ts');assert.match(home,/section\.contenido/);assert.doesNotMatch(home,/innerHTML/);
console.log('Web content: slider controls, keyboard, manual navigation, stale list responses, ordered actions, scoped theme, reusable admin forms and routes passed without browser.');
