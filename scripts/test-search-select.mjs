import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const source = readFileSync(new URL('../src/app/shared/components/search-select/search-select.utils.ts',import.meta.url),'utf8');
const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const exports = {};
vm.runInNewContext(code,{exports});
const filter = exports.filterSelectOptions;
const options = [
  {value:'none',label:'Sin cliente registrado'},
  {value:'1',label:'Jose Perez · 70111222 · 12345'},
  {value:'2',label:'María Álvarez · 70222333 · 98765'},
  {value:'3',label:'Cancha Norte / Fútbol'},
];
const ids = query => Array.from(filter(options,query),option=>option.value);
assert.deepEqual(ids(''),['none','1','2','3']);
assert.deepEqual(ids('  '),['none','1','2','3']);
assert.deepEqual(ids('maria'),['2']);
assert.deepEqual(ids('ALVAREZ'),['2']);
assert.deepEqual(ids('70222'),['2']);
assert.deepEqual(ids('12345'),['1']);
assert.deepEqual(ids('perez jose'),['1']);
assert.deepEqual(ids('norte futbol'),['3']);
assert.deepEqual(ids('sin cliente'),['none']);
assert.deepEqual(ids('inexistente'),[]);
assert.equal(options.length,4);
const componentSource = readFileSync(new URL('../src/app/shared/components/search-select/search-select.component.ts',import.meta.url),'utf8');
const componentCode = ts.transpileModule(componentSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
let trackingEffect;
const pendingEffects = new Set();
const state = value => {
  const subscribers=new Set();
  const read=()=>{if(trackingEffect){subscribers.add(trackingEffect);trackingEffect.dependencies.add(subscribers);}return value;};
  read.set=next=>{if(Object.is(next,value))return;value=next;for(const effect of subscribers)pendingEffects.add(effect);};
  return read;
};
const flushEffects=()=>{
  while(pendingEffects.size){
    const effect=pendingEffects.values().next().value;pendingEffects.delete(effect);
    for(const subscribers of effect.dependencies)subscribers.delete(effect);
    effect.dependencies.clear();trackingEffect=effect;
    try{effect.run();}finally{trackingEffect=undefined;}
  }
};
const angular = {Component:()=>value=>value,ChangeDetectionStrategy:{OnPush:0},signal:state,input:state,computed:fn=>fn,
  forwardRef:fn=>fn,viewChild:()=>state(undefined),afterRenderEffect:run=>pendingEffects.add({run,dependencies:new Set()})};
const componentExports = {};
vm.runInNewContext(componentCode,{exports:componentExports,require:name=>{
  if(name==='@angular/core')return angular;
  if(name==='@angular/forms')return {NG_VALUE_ACCESSOR:{}};
  if(name==='./search-select.utils')return exports;
  throw new Error(`Unexpected dependency: ${name}`);
}});
const select = new componentExports.SearchSelectComponent();
select.options.set(options);
let changed='';let touched=0;
select.registerOnChange(value=>changed=value);
select.registerOnTouched(()=>touched++);
select.writeValue('2');
assert.equal(select.selectedLabel(),'María Álvarez · 70222333 · 98765');
select.show();
assert.equal(select.active(),2);
select.search('norte');
assert.equal(changed,'');
assert.equal(select.filtered().length,1);
let prevented=false;
select.key({key:'Enter',preventDefault:()=>prevented=true});
assert.equal(prevented,true);
assert.equal(changed,'3');
assert.equal(select.expanded(),false);
assert.equal(touched,1);
select.show();
let stopped=false;
select.key({key:'Escape',stopPropagation:()=>stopped=true});
assert.equal(stopped,true);
assert.equal(select.value(),'3');
select.setDisabledState(true);
select.show();
assert.equal(select.expanded(),false);

const pointerSelect = new componentExports.SearchSelectComponent();
const clientOptions = [{value:'sin-cliente',label:'Sin cliente registrado'},...Array.from({length:24},(_,i)=>({value:String(i+10),label:`Cliente ${i+10}`}))];
const list={scrollTop:0,children:[]};
const scrolled=[];
list.children=clientOptions.map((option,index)=>({scrollIntoView(){list.scrollTop=index*40;scrolled.push(option.value);}}));
pointerSelect.options.set(clientOptions);pointerSelect.results.set({nativeElement:list});
pointerSelect.field.set({nativeElement:{focus(){}}});
let client='sin-cliente';pointerSelect.registerOnChange(value=>client=value);
pointerSelect.writeValue(client);pointerSelect.show();flushEffects();
assert.equal(scrolled.at(-1),'sin-cliente');
list.scrollTop=600;
const scrollCount=scrolled.length;
pointerSelect.options.set(clientOptions.map(option=>({...option})));flushEffects();
assert.equal(list.scrollTop,600,'Re-rendering equivalent options must not move a list while the user is clicking a customer');
assert.equal(scrolled.length,scrollCount,'Options from a parent getter must not scroll back to Sin cliente registrado');
pointerSelect.choose(clientOptions[16]);flushEffects();
assert.equal(client,'25');assert.equal(pointerSelect.value(),'25');assert.equal(pointerSelect.expanded(),false);
assert.equal(pointerSelect.selectedLabel(),'Cliente 25');
pointerSelect.writeValue(client);pointerSelect.options.set(clientOptions.map(option=>({...option})));flushEffects();
assert.equal(pointerSelect.value(),'25','ngModel writes and option refreshes must preserve the selected customer');
pointerSelect.show();flushEffects();
assert.equal(scrolled.at(-1),'25','Opening should scroll to the selected customer');
pointerSelect.key({key:'ArrowDown',preventDefault(){}});flushEffects();
assert.equal(scrolled.at(-1),'26','Keyboard navigation still scrolls the active option into view');
pointerSelect.key({key:'Enter',preventDefault(){}});flushEffects();
assert.equal(client,'26');assert.equal(pointerSelect.expanded(),false);
pointerSelect.show();flushEffects();pointerSelect.search('Cliente 30');
list.children=[{scrollIntoView(){list.scrollTop=0;scrolled.push('search-result');}}];flushEffects();
assert.equal(scrolled.at(-1),'search-result','Changing the search query must still scroll to its first result');
assert.equal(client,'','Typing must clear the old selection rather than silently choose Sin cliente registrado');
pointerSelect.choose(clientOptions.find(option=>option.value==='30'));flushEffects();
assert.equal(client,'30');assert.equal(pointerSelect.selectedLabel(),'Cliente 30');
console.log('Search select: filtering, CVA values, mouse selection, stable manual scroll across option refreshes, search and keyboard navigation passed without browser.');
