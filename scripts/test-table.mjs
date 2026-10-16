import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';

const base=new URL('../src/app/',import.meta.url);
const read=path=>readFileSync(new URL(path,base),'utf8');
const input=value=>()=>value;input.required=()=>()=>'';
let metadata;
const exports={};
vm.runInNewContext(ts.transpileModule(read('shared/components/table/table.component.ts'),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,
}}).outputText,{exports,require:()=>({input,Component:options=>{metadata=options;return value=>value;},
  ChangeDetectionStrategy:{OnPush:0},ViewEncapsulation:{None:0}})});
const table=new exports.TableComponent();
assert.equal(table.fixed(),false);assert.equal(table.minWidth(),'640px');
assert.equal(parseTemplate(metadata.template,'shared-table').errors,null);
assert.match(metadata.template,/\[attr.aria-label\]="label\(\)"/);
assert.match(metadata.template,/\[style.min-width\]="minWidth\(\)"/);
assert.match(metadata.template,/\[class.table-fixed\]="fixed\(\)"/);
for(const section of ['thead','tbody','tfoot'])assert.match(metadata.template,new RegExp(`ng-content select="${section}"`));

function elements(nodes,name,found=[]){
  for(const node of nodes??[]){
    if(node.name===name)found.push(node);
    elements(node.children,name,found);
    for(const branch of node.branches??[])elements(branch.children,name,found);
  }
  return found;
}
function template(source){
  const ast=ts.createSourceFile('component.ts',source,ts.ScriptTarget.Latest,true);
  let result;
  function walk(node){
    if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='template'&&
      (ts.isNoSubstitutionTemplateLiteral(node.initializer)||ts.isStringLiteral(node.initializer)))result=node.initializer.text;
    ts.forEachChild(node,walk);
  }
  walk(ast);return result;
}
function evaluate(expression,context){
  return vm.runInNewContext(expression,context);
}
// Count rendered cells, including permission branches and dynamic catalog columns.
function cells(nodes,tag,context){
  let total=0;
  for(const node of nodes??[]){
    if(node.name===tag){total++;continue;}
    if(node.branches){
      const branch=node.branches.find(branch=>!branch.expression||evaluate(branch.expression.source,context));
      total+=cells(branch?.children,tag,context);
    }else if(node.item){
      for(const item of evaluate(node.expression.source,context))
        total+=cells(node.children,tag,{...context,[node.item.name]:item});
    }else total+=cells(node.children,tag,context);
  }
  return total;
}
let actionBindings=0,badgeBindings=0;
function checkBindings(item,path){
  const sample={id:73,estado:'CONFIRMADA',activo:true,activa:true,sesion_actual:12,cierre:null,accion:'editar'};
  const calls=[];
  const context={row:sample,usuario:sample,rol:sample,permiso:sample,box:sample,r:sample,s:sample,b:sample,p:sample,
    labels:{CONFIRMADA:'Confirmada'}, config:()=>({state:'activo'}),detail:{set:value=>calls.push(value)},receipt:{set:value=>calls.push(value)},
    removeTarget:{set:value=>calls.push(value)},selected:{set:value=>calls.push(value)},col:{key:'estado'},status:()=>({label:'Reserva confirmada',tone:'success'})};
  for(const name of ['open','edit','openEdit','moveItem','confirmToggle','openAsignaciones','openPermisos','askRelease','selectSession','askToggle','showReceipt','view','repeat','askRemove'])
    context[name]=value=>calls.push(value);
  for(const elementName of ['app-button','app-dropdown-item']){
    for(const element of elements(item.children,elementName)){
      const event=element.outputs.find(output=>output.name==='clicked');
      assert.ok(event,`${path}: action without a click handler`);
      calls.length=0;evaluate(event.handler.source,context);
      assert.equal(calls.length,1,`${path}: row action must invoke one handler`);
      assert.ok(calls[0]===sample||calls[0]===sample.id,`${path}: action passed the wrong row`);
      actionBindings++;
    }
  }
  for(const badge of elements(item.children,'app-badge')){
    const binding=badge.inputs.find(input=>input.name==='active'||input.name==='state'||input.name==='label');
    assert.ok(binding,`${path}: badge without data binding`);
    assert.notEqual(evaluate(binding.value.source,context),undefined,`${path}: badge binding has no value`);
    badgeBindings++;
  }
}
function checkActionGetter(source,path){
  const ast=ts.createSourceFile('component.ts',source,ts.ScriptTarget.Latest,true);
  let getter;
  function walk(node){
    if(ts.isGetAccessor(node)&&node.name.getText(ast)==='showActions')getter=node;
    ts.forEachChild(node,walk);
  }
  walk(ast);if(!getter)return;
  const permissions=[...getter.body.getText(ast).matchAll(/'([a-z_]+\.[a-z_]+)'/g)].map(match=>match[1]);
  const body=ts.transpile(getter.body.getText(ast),{target:ts.ScriptTarget.ES2022});
  const globalRequired=!path.pathname.includes('/usuarios/');
  for(const global of [false,true])for(const allowed of [[],...permissions.map(permission=>[permission])]){
    const auth={can:(permission,requiresGlobal=false)=>allowed.includes(permission)&&(!requiresGlobal||global)};
    const actual=vm.runInNewContext(`(function()${body}).call({auth})`,{auth});
    assert.equal(actual,allowed.length>0&&(!globalRequired||global),`${path}: incorrect action permissions`);
  }
}
let count=0, screens=0;
function audit(directory){
  for(const entry of readdirSync(directory,{withFileTypes:true})){
    const path=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
    if(entry.isDirectory()){audit(path);continue;}
    if(!entry.name.endsWith('.component.ts'))continue;
    const source=readFileSync(path,'utf8'),html=template(source);
    if(!html)continue;
    const parsed=parseTemplate(html,path.pathname);
    assert.equal(parsed.errors,null,path.pathname);
    assert.equal(elements(parsed.nodes,'table').length,0,`${path}: native table outside the shared component`);
    assert.doesNotMatch(html,/class="list-(?:header|row|col)\b/,`${path}: old grid list`);
    const tables=elements(parsed.nodes,'app-table');
    if(!tables.length)continue;
    screens++;
    checkActionGetter(source,path);
    for(const item of tables){
      count++;
      assert.ok(item.attributes.some(a=>a.name==='label')||item.inputs.some(a=>a.name==='label'),`${path}: unnamed table`);
      assert.equal(item.children.filter(child=>child.name==='thead').length,1,`${path}: missing projected header`);
      assert.equal(item.children.filter(child=>child.name==='tbody').length,1,`${path}: missing projected rows`);
      for(const header of elements(item.children,'th'))assert.ok(header.attributes.some(a=>a.name==='scope'&&a.value==='col'),`${path}: column scope missing`);
      const header=elements(item.children,'thead')[0],body=elements(item.children,'tbody')[0];
      const row=elements(body.children,'tr')[0];
      assert.ok(row,`${path}: missing row template`);
      for(const permitted of [false,true]){
        const catalog=path.pathname.includes('/catalogo/');
        const context={auth:{can:()=>permitted},showActions:catalog?()=>permitted:permitted,
          config:()=>({columns:[{key:'nombre'},{key:'codigo'},{key:'sucursal'}]}),
          columns:()=>[{key:'nombre'},{key:'estado'},{key:'total'}]};
        assert.equal(cells(header.children,'th',context),cells(row.children,'td',context),`${path}: rendered columns mismatch (${permitted})`);
      }
      checkBindings(item,path);
    }
    if(/\/(usuarios|roles|permisos)\//.test(path.pathname)){
      const item=tables[0],header=elements(item.children,'thead')[0],body=elements(item.children,'tbody')[0];
      assert.equal(elements(header.children,'th').length,elements(body.children,'td').length,`${path}: mismatched columns`);
      assert.ok(elements(body.children,'app-dropdown').length,`${path}: row actions lost`);
      assert.match(html,/\[loading\]="loading\(\)"/);
      assert.match(html,/\[error\]="loadError\(\)"/);
    }
  }
}
audit(new URL('features/',base));
assert.equal(count,22,'Audit all tabular views, including reports, audit, notices and public history');
assert.equal(screens,14);
assert.match(read('features/reservas/agenda.component.ts'),/\[fixed\]="true" minWidth="0"/);
assert.match(read('shared/components/list-shell/list-shell.component.css'),/overflow-x: auto/);
assert.match(read('shared/components/table/table.component.css'),/\.app-data-table\.table-fixed \{ table-layout: fixed/);
assert.match(read('shared/components/table/table.component.css'),/max-width:600px/);
assert.ok(actionBindings>=15);assert.ok(badgeBindings>=10);
console.log(`Shared table: 22 tables across 14 implementations, permission-dependent columns, ${actionBindings} row action bindings, ${badgeBindings} badge bindings, global access rules and responsive layout passed without browser.`);
