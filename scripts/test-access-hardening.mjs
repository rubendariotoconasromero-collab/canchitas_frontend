import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as rxjs from 'rxjs';

const read=path=>readFileSync(new URL('../src/app/'+path,import.meta.url),'utf8');
const transpile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
const storage=()=>{const entries=new Map();return {getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,String(value)),removeItem:key=>entries.delete(key)};};
const localStorage=storage(),sessionStorage=storage();
localStorage.setItem('canchitas_token','legacy');
const storageModule={};
vm.runInNewContext(transpile(read('core/services/storage.service.ts')),{exports:storageModule,localStorage,sessionStorage,require:()=>({Injectable:()=>value=>value})});
const store=new storageModule.StorageService();
assert.equal(localStorage.getItem('canchitas_token'),null);
store.setSession('session-token',{nombre:'Operador'});
assert.equal(store.getToken(),'session-token');
assert.equal(localStorage.getItem('canchitas_token'),null);
assert.equal(store.getUser().nombre,'Operador');

class Auth{} class Router{}
let cleared=0,navigated='';
const providers=new Map([[storageModule.StorageService,store],[Auth,{clearSession:()=>cleared++,me:()=>rxjs.of({})}],[Router,{navigate:path=>navigated=path[0]}]]);
const interceptor={};
vm.runInNewContext(transpile(read('core/interceptors/auth.interceptor.ts')),{exports:interceptor,require:name=>{
  if(name==='@angular/core')return {inject:token=>providers.get(token)};
  if(name==='@angular/router')return {Router};
  if(name==='rxjs')return rxjs;
  if(name.endsWith('auth.service'))return {AuthService:Auth};
  if(name.endsWith('storage.service'))return storageModule;
  return {API_BASE_URL:'/api',API_ENDPOINTS:{login:'/api/login/',me:'/api/me/'}};
}});
const request=url=>({url,clone:changes=>({url,headers:changes.setHeaders})});
let sent;
interceptor.authInterceptor(request('/api/me/'),r=>{sent=r;return rxjs.of({});}).subscribe();
assert.equal(sent.headers.Authorization,'Token session-token');
interceptor.authInterceptor(request('https://other.test/'),r=>{sent=r;return rxjs.of({});}).subscribe();
assert.equal(sent.headers,undefined);
interceptor.authInterceptor(request('/api/me/'),()=>rxjs.throwError(()=>({status:401}))).subscribe({error:()=>{}});
assert.equal(cleared,1);assert.equal(navigated,'/login');
store.clear();assert.equal(store.getToken(),null);assert.equal(store.getUser(),null);
assert.match(read('features/auth/login/login.component.ts'),/password: \['',/);
console.log('Access hardening: session storage, legacy cleanup, API token scope and expired-session handling passed without browser.');
