import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {parseTemplate} from '@angular/compiler';
import * as rxjs from 'rxjs';
let navigation;
const destinations=[];
class Router{}
class NavigationEnd{constructor(url){this.urlAfterRedirects=url;}}
const router={url:'/login',navigateByUrl:url=>{destinations.push(url);return Promise.resolve(true);},events:{pipe:()=>({subscribe:fn=>navigation=fn})}};
const exports={};
const navigationSource=readFileSync(new URL('../src/app/core/services/page-navigation.service.ts',import.meta.url),'utf8');
vm.runInNewContext(ts.transpileModule(navigationSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText,
  {exports,require:name=>name==='@angular/core'?{Injectable:()=>value=>value,inject:token=>token===Router?router:{}}:name==='@angular/router'?{Router,NavigationEnd}:name==='rxjs'?{filter:()=>null}:{takeUntilDestroyed:()=>null}});
const service=new exports.PageNavigationService();
service.back();assert.equal(destinations.at(-1),'/dashboard');
navigation(new NavigationEnd('/dashboard'));
navigation(new NavigationEnd('/agenda?nueva=1'));
navigation(new NavigationEnd('/agenda'));
service.back();assert.equal(destinations.at(-1),'/dashboard','Query changes must not create false previous screens');
navigation(new NavigationEnd('/clientes'));
service.back();assert.equal(destinations.at(-1),'/agenda');
navigation(new NavigationEnd('/agenda'));
service.back();assert.equal(destinations.at(-1),'/dashboard','Sequential Back does not bounce between screens');
service.back('/canchas');assert.equal(destinations.at(-1),'/canchas');
navigation(new NavigationEnd('/login'));
navigation(new NavigationEnd('/caja'));
service.back();assert.equal(destinations.at(-1),'/dashboard','Login clears previous user navigation');
navigation(new NavigationEnd('/sin-acceso'));
navigation(new NavigationEnd('/clientes'));
service.back();assert.equal(destinations.at(-1),'/caja','Access errors must not become Back destinations');

const headerSource=readFileSync(new URL('../src/app/shared/components/page-header/page-header.component.ts',import.meta.url),'utf8');
let template;
const headerExports={};
const input=value=>()=>value;
input.required=()=>()=>'';
vm.runInNewContext(ts.transpileModule(headerSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText,
  {exports:headerExports,require:name=>name==='@angular/core'?{ChangeDetectionStrategy:{OnPush:0},Component:metadata=>{template=metadata.template;return value=>value;},input,inject:()=>service}:new Proxy({},{get:()=>class{}})});
const header=new headerExports.PageHeaderComponent();
assert.equal(header.showBack(),true);assert.equal(header.backLabel(),'Regresar');
header.backRoute=()=>'/canchas';header.goBack();assert.equal(destinations.at(-1),'/canchas');
assert.equal(parseTemplate(template,'page-header').errors,null);
assert.match(template,/<ng-content\s*\/>/);
assert.match(template,/@if\(showBack\(\)\)/);
const detail=readFileSync(new URL('../src/app/features/catalogo/cancha-detail.component.ts',import.meta.url),'utf8');
assert.match(detail,/backRoute="\/canchas"/);assert.match(detail,/<app-catalog-list[^>]+\[showBack\]="false"/);

const appBase=new URL('../src/app/',import.meta.url);
const routeSource=readFileSync(new URL('app.routes.ts',appBase),'utf8');
const routeAst=ts.createSourceFile('app.routes.ts',routeSource,ts.ScriptTarget.Latest,true);
const imports=new Map();
for(const statement of routeAst.statements){
  if(ts.isImportDeclaration(statement)&&statement.importClause?.namedBindings&&ts.isNamedImports(statement.importClause.namedBindings)){
    for(const name of statement.importClause.namedBindings.elements)imports.set(name.name.text,statement.moduleSpecifier.text);
  }
}
const audited=[];
function audit(node){
  if(ts.isObjectLiteralExpression(node)){
    const props=new Map(node.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(routeAst).replace(/['"]/g,''),p.initializer]));
    const path=props.get('path'),component=props.get('component'),lazy=props.get('loadComponent');
    if(path&&ts.isStringLiteral(path)&&path.text&&path.text!=='login'&&(component||lazy)){
      const file=component?imports.get(component.getText(routeAst)):lazy.getText(routeAst).match(/import\('([^']+)'\)/)?.[1];
      assert.ok(file,`Cannot resolve route ${path.text}`);
      let content=readFileSync(new URL(file+'.ts',appBase),'utf8');
      if(component?.getText(routeAst)==='CatalogPageComponent'){
        assert.match(content,/<app-catalog-list/);
        content=readFileSync(new URL('features/catalogo/catalog-list.component.ts',appBase),'utf8');
      }
      assert.match(content,/<app-page-header/,`${path.text}: missing reusable page header`);
      audited.push(path.text);
    }
  }
  ts.forEachChild(node,audit);
}
audit(routeAst);assert.equal(audited.length,24,'Administrative, reports, audit, public history/detail/tracking and access-error screens must be audited');

class Auth{}
let permissions=[];
const auth={can:p=>permissions.includes(p),me:()=>rxjs.of({}),clearSession:()=>{}};
const guardRouter={createUrlTree:segments=>segments[0]};
const guardExports={};
const guardSource=readFileSync(new URL('core/guards/permission.guard.ts',appBase),'utf8');
vm.runInNewContext(ts.transpileModule(guardSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
  {exports:guardExports,require:name=>name==='@angular/core'?{inject:token=>token===Router?guardRouter:auth}:name==='@angular/router'?{Router}:name==='rxjs'?rxjs:{AuthService:Auth}});
for(const [allowed,expected] of [[['dashboard.ver'],true],[['reservas.ver'],'/agenda'],[['caja.ver'],'/caja'],[['clientes.ver'],'/clientes'],[['solicitudes.ver'],'/solicitudes'],[[],'/sin-acceso']]){
  permissions=allowed;
  let result;
  guardExports.permissionGuard({data:{permission:'dashboard.ver'}}).subscribe(value=>result=value);
  assert.equal(result,expected,'Back fallback must respect current permissions');
}
console.log('Page headers: internal history, direct entry fallback, query cleanup, logout reset, explicit parent routes and projected actions passed without browser.');
console.log('All 24 routed administrative/public/error screens use shared headers; Dashboard fallback verified with actual permission guard and RxJS.');
