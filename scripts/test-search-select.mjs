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
const state = value => {const read=()=>value;read.set=next=>value=next;return read;};
const angular = {Component:()=>value=>value,ChangeDetectionStrategy:{OnPush:0},signal:state,input:state,computed:fn=>fn,
  forwardRef:fn=>fn,viewChild:()=>()=>undefined,afterRenderEffect:()=>{}};
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
console.log('Search select: 22 comprobaciones correctas, sin navegador (filtro y logica del control).');
