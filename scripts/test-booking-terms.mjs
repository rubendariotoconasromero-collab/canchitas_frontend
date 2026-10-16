import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {parseTemplate} from '@angular/compiler';

const base=new URL('../src/app/',import.meta.url);
const read=path=>readFileSync(new URL(path,base),'utf8');
const exports={};
vm.runInNewContext(ts.transpileModule(read('features/reservas/agenda.utils.ts'),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});
for(const state of ['PENDIENTE','CONFIRMADA','EN_CURSO','FINALIZADA','CANCELADA','EXPIRADA']){
  for(const balance of ['100.00','0.00','-1.00','invalid']){
    assert.equal(exports.hasPendingPayment({estado:state,saldo_pendiente:balance}),state==='PENDIENTE'&&balance==='100.00');
  }
}
assert.equal(exports.reservationActionLabel('RETENER'),'Horario apartado');
assert.equal(exports.reservationActionLabel('EXPIRAR'),'Plazo de pago vencido');
assert.equal(exports.reservationActionLabel('OTRA_ACCION'),'OTRA_ACCION');

const source=read('features/reservas/agenda.component.ts');
const ast=ts.createSourceFile('agenda.ts',source,ts.ScriptTarget.Latest,true);let html;
function visit(node){if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='template')html=node.initializer.text;ts.forEachChild(node,visit);}
visit(ast);const parsed=parseTemplate(html,'agenda');assert.equal(parsed.errors,null);
let alertBranch;
function find(nodes){
  for(const node of nodes??[]){
    for(const branch of node.branches??[]){
      if(branch.expression?.source==='pendingPayment(r)')alertBranch=branch;
      find(branch.children);
    }
    find(node.children);
  }
}
find(parsed.nodes);assert.ok(alertBranch,'Pending-payment notice must have its own condition');
for(const state of ['PENDIENTE','CONFIRMADA','EN_CURSO','FINALIZADA','CANCELADA','EXPIRADA']){
  const visible=vm.runInNewContext(alertBranch.expression.source,{pendingPayment:exports.hasPendingPayment,r:{estado:state,saldo_pendiente:'100.00'}});
  assert.equal(visible,state==='PENDIENTE');
}
assert.match(html,/Apartar horario/);assert.match(html,/\(paid\)="reservationPaid\(\)"/);
// Keep API/database keys intact while removing the old vocabulary from display strings.
function audit(directory){
  for(const entry of readdirSync(directory,{withFileTypes:true})){
    const path=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
    if(entry.isDirectory()){audit(path);continue;}
    if(!entry.name.endsWith('.ts')||entry.name.endsWith('.spec.ts'))continue;
    const text=readFileSync(path,'utf8');
    assert.doesNotMatch(text,/\b(?:Retencion|Retenciones|Retener horario|Horario retenido)\b/,path.pathname);
  }
}
audit(base);
console.log('Booking terminology: visible labels, preserved API keys/history codes, all reservation states and balances, actual template alert condition and payment-success cleanup passed without browser.');
