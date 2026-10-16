import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';
import '@angular/compiler';
import * as forms from '@angular/forms';

const base=new URL('../src/app/',import.meta.url);
const read=path=>readFileSync(new URL(path,base),'utf8');
const state=initial=>{let value=initial;const fn=()=>value;fn.set=next=>value=next;return fn;};
const input=state;input.required=()=>state(undefined);
const modules=new Map();
let metadata;
function load(path){
  if(modules.has(path))return modules.get(path);
  const exports={};modules.set(path,exports);
  vm.runInNewContext(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,
    target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports,URL,
    require:name=>{
      if(name==='@angular/core')return {input,signal:state,computed:fn=>fn,forwardRef:fn=>fn,
        Component:options=>{metadata=options;return value=>value;},ChangeDetectionStrategy:{OnPush:0},
        ViewEncapsulation:{None:0},output:()=>({emit:()=>{}}),viewChild:()=>()=>undefined,afterRenderEffect:()=>{}};
      if(name==='@angular/forms')return forms;
      if(name==='./search-select.utils')return load('shared/components/search-select/search-select.utils.ts');
      if(name==='../select/select.component')return load('shared/components/select/select.component.ts');
      throw new Error(`Unexpected dependency ${name}`);
    }});
  return exports;
}
const inputExports=load('shared/components/input/input.component.ts');
assert.ok(metadata.providers.some(provider=>provider.provide===forms.NG_VALIDATORS));
const field=new inputExports.InputComponent();
const control=new forms.FormControl('');
const validate=value=>{control.setValue(value);return field.validate(control);};
field.required.set(true);
assert.ok(validate('').required);assert.ok(validate('  ').required);
field.required.set(false);assert.equal(validate(''),null);
field.type.set('email');assert.ok(validate('no-es-correo').email);assert.equal(validate('cliente@gmail.com'),null);
field.type.set('url');assert.ok(validate('javascript:alert(1)').url);assert.ok(validate('sitio').url);
assert.equal(validate('https://example.com/cancha'),null);
field.type.set('number');field.min.set(60);field.max.set(1440);
assert.ok(validate('59').min);assert.equal(validate('60'),null);assert.equal(validate('1440'),null);
assert.ok(validate('1441').max);assert.ok(validate('abc').number);assert.ok(validate(Infinity).number);
assert.equal(validate(0)?.min.min,60);
let revalidated=0;field.registerOnValidatorChange(()=>revalidated++);
field.min.set(1);field.ngOnChanges();assert.equal(revalidated,1);assert.equal(validate('2'),null);

for(const [path,name,event,value] of [
  ['input/input','Input','onInput','Ana'],['select/select','Select','onSelect','2'],
  ['textarea/textarea','Textarea','update','Descripcion'],['checkbox/checkbox','Checkbox','update',true],
]){
  const exported=load(`shared/components/${path}.component.ts`);
  const instance=new exported[name+'Component']();let changed,touched=0;
  instance.registerOnChange(value=>changed=value);instance.registerOnTouched(()=>touched++);
  instance.writeValue(null);assert.equal(changed,undefined,'Model writes must not emit changes');
  instance[event](value);assert.equal(changed,value);
  (instance.onBlur??instance.onTouched).call(instance);assert.equal(touched,1);
  instance.setDisabledState(true);assert.equal((instance._disabled??instance.formDisabled??instance.disabled)(),true);
  instance.setDisabledState(false);assert.equal((instance._disabled??instance.formDisabled??instance.disabled)(),false);
  assert.equal(parseTemplate(metadata.template,path).errors,null);
}
const selector=new (load('shared/components/search-select/search-select.component.ts').SearchSelectComponent)();
selector.options.set([{value:'1',label:'Bernabeu'},{value:'2',label:'La Cantera'}]);
let selected='',touched=0;selector.registerOnChange(value=>selected=value);selector.registerOnTouched(()=>touched++);
selector.writeValue(1);assert.equal(selector.selectedLabel(),'Bernabeu');
selector.search('Cantera');assert.equal(selected,'');selector.choose(selector.filtered()[0]);
assert.equal(selected,'2');assert.equal(touched,1);selector.toggle();assert.equal(selected,'');
selector.setDisabledState(true);selector.show();assert.equal(selector.expanded(),false);
selector.choose({value:'1',label:'Bernabeu'});selector.search('Bernabeu');selector.toggle();
assert.equal(selected,'');assert.equal(selector.expanded(),false);
selector.setDisabledState(false);selector.choose({value:'999',label:'No disponible'});assert.equal(selected,'');
const file=new (load('shared/components/file-input/file-input.component.ts').FileInputComponent)();
const anotherFile=new (modules.get('shared/components/file-input/file-input.component.ts').FileInputComponent)();
assert.notEqual(file.id,anotherFile.id);assert.match(metadata.template,/changed.emit\(\$event\)/);

function template(source){
  const ast=ts.createSourceFile('component.ts',source,ts.ScriptTarget.Latest,true);let html;
  function walk(node){if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='template'&&
    (ts.isStringLiteral(node.initializer)||ts.isNoSubstitutionTemplateLiteral(node.initializer)))html=node.initializer.text;
    ts.forEachChild(node,walk);}
  walk(ast);return html;
}
function elements(nodes,name,result=[]){
  for(const node of nodes??[]){if(node.name===name)result.push(node);elements(node.children,name,result);
    for(const branch of node.branches??[])elements(branch.children,name,result);
    for(const branch of node.cases??[])elements(branch.children,name,result);}
  return result;
}
let total=0;
function audit(directory){
  for(const entry of readdirSync(directory,{withFileTypes:true})){
    const path=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
    if(entry.isDirectory()){audit(path);continue;}
    if(!entry.name.endsWith('.component.ts'))continue;
    const html=template(readFileSync(path,'utf8'));if(!html)continue;
    const parsed=parseTemplate(html,path.pathname);assert.equal(parsed.errors,null);
    for(const native of ['input','select','textarea'])assert.equal(elements(parsed.nodes,native).length,0,`${path}: non-reusable ${native}`);
    for(const form of elements(parsed.nodes,'form')){
      total++;const submit=form.outputs.find(output=>output.name==='ngSubmit');assert.ok(submit,`${path}: missing submit handler`);
      if(form.references.some(reference=>reference.value==='ngForm')){
        const reference=form.references.find(reference=>reference.value==='ngForm').name;
        assert.ok(submit.handler.source.startsWith(reference+'.valid &&'),'Template-driven submits must block invalid forms');
        for(const controlName of ['app-input','app-select','app-textarea','app-checkbox','app-search-select']){
          for(const element of elements(form.children,controlName))assert.ok(element.attributes.some(a=>a.name==='name'),`${path}: unnamed ngModel control`);
        }
        let called=0;const ctx={[reference]:{valid:false},save:()=>called++,saveName:()=>called++,pay:()=>called++,submit:()=>called++,consult:()=>called++,accept:()=>called++,reject:()=>called++,add:()=>called++};
        vm.runInNewContext(submit.handler.source,ctx);assert.equal(called,0);
        ctx[reference].valid=true;vm.runInNewContext(submit.handler.source,ctx);assert.equal(called,1);
      }
    }
  }
}
audit(new URL('features/',base));assert.equal(total,14);
assert.match(read('features/usuarios/components/usuario-modal.component.ts'),/this.editing\(\) \? \[Validators.minLength\(8\)\]/);
assert.match(read('features/catalogo/catalog-list.component.ts'),/Validators.email/);
console.log('Forms: all 14 form implementations use shared controls; CVA values/reset/touched/disabled, required/email/URL/numeric limits, dynamic validation, live search, file events and invalid submit guards passed without browser.');
