import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';

const source=readFileSync(new URL('../src/app/shared/components/layout/sidebar/sidebar.component.ts',import.meta.url),'utf8');
let template;
let navigation;
let expanded=0;
const signal=value=>{const read=()=>value;read.set=next=>value=next;return read;};
class Router{}
class NavigationEnd{constructor(url){this.urlAfterRedirects=url;}}
const router={url:'/sucursales',events:{pipe:()=>({subscribe:fn=>navigation=fn})}};
const exports={};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText,
  {exports,require:name=>{
    if(name==='@angular/core')return{Component:metadata=>{template=metadata.template;return value=>value;},signal,input:signal,output:()=>({emit:()=>expanded++}),inject:token=>token===Router?router:{can:()=>true}};
    if(name==='@angular/router')return{Router,NavigationEnd};
    if(name==='rxjs')return{filter:()=>null};
    if(name==='@angular/core/rxjs-interop')return{takeUntilDestroyed:()=>null};
    return new Proxy({},{get:()=>class{}});
  }});
const sidebar=new exports.SidebarComponent();
assert.equal(sidebar.businessActive(),true);
assert.equal(sidebar.businessExpanded(),true);
assert.equal(sidebar.catalogActive(),false);
for(const url of ['/canchas','/canchas/5','/deportes?search=futbol']){
  navigation(new NavigationEnd(url));
  assert.equal(sidebar.catalogActive(),true);assert.equal(sidebar.businessActive(),false);
}
for(const url of ['/negocio','/contenido-web','/sucursales?search=central','/politicas#detalle','/administracion-cajas']){
  navigation(new NavigationEnd(url));
  assert.equal(sidebar.businessActive(),true);assert.equal(sidebar.catalogActive(),false);
}
navigation(new NavigationEnd('/clientes'));
assert.equal(sidebar.businessActive(),false);assert.equal(sidebar.catalogActive(),false);
sidebar.toggleBusiness();assert.equal(sidebar.businessExpanded(),false);
sidebar.compact.set(true);sidebar.toggleBusiness();
assert.equal(sidebar.businessExpanded(),true);assert.equal(expanded,1);

const parsed=parseTemplate(template,'sidebar');assert.equal(parsed.errors,null);
function find(nodes,predicate){for(const node of nodes){if(predicate(node))return node;const result=find(node.children||node.branches||[],predicate);if(result)return result;}}
function groupLinks(id){const group=find(parsed.nodes,n=>n.attributes?.some(a=>a.name==='id'&&a.value===id));
  return group.children.map(node=>node.children?.[0]||node).map(node=>node.attributes?.find(a=>a.name==='routerLink')?.value).filter(Boolean);}
assert.deepEqual(groupLinks('catalog-submenu'),['/canchas','/deportes']);
assert.deepEqual(groupLinks('business-submenu'),['/negocio','/contenido-web','/sucursales','/politicas','/administracion-cajas']);
const branch=find(parsed.nodes,n=>n.expression?.source.includes("auth.can('negocio.ver', true)"));
const isVisible=new Function('auth',`return ${branch.expression.source}`);
const permissions=(values,global=false)=>({can:(p,needsGlobal=false)=>values.includes(p)&&(!needsGlobal||global)});
assert.equal(isVisible(permissions(['negocio.ver'])),false,'No empty group for local business-only access');
assert.equal(isVisible(permissions(['negocio.ver'],true)),true);
assert.equal(isVisible(permissions(['sucursales.ver'])),true);
assert.equal(isVisible(permissions(['politicas.ver'])),true);
assert.equal(isVisible(permissions(['canchas.ver'])),false);
console.log('Sidebar: sports/business separation, permissions, active routes, expansion and compact navigation passed without browser.');
