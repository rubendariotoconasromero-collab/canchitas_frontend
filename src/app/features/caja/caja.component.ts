import { Component, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { RESERVAS_UI } from '../reservas/reservas-ui';
import { apiError } from '../reservas/reservas.service';
import { AuthService } from '../../core/services/auth.service';
import { CajaService, CashBox, CashSession, CashMovement, PaymentMethod, Receipt } from './caja.service';
import { ReceiptComponent } from './receipt.component';
import { TextareaComponent } from '../../shared/components/textarea/textarea.component';
import { SnackbarService } from '../../core/services/snackbar.service';
import { TabsComponent } from '../../shared/components/tabs/tabs.component';

@Component({selector:'app-caja',imports:[...RESERVAS_UI,ReceiptComponent,TextareaComponent,TabsComponent],styleUrls:['../reservas/reservas.component.css','./caja.component.css'],template:`
  <div class="main-content">
    <app-page-header title="Caja" icon="payments">@if(auth.can('caja.configurar',true)){<app-button-link route="/administracion-cajas" icon="settings" variant="outline-secondary">Administrar cajas</app-button-link>}</app-page-header>
    <app-list-toolbar label="Seleccion de caja" [searchEnabled]="false" [showRefresh]="true" [loading]="loading()" refreshLabel="Actualizar caja" (refreshed)="load()"><app-select toolbar-filter label="Caja / sucursal" placeholder="Seleccionar" [options]="boxOptions" [(ngModel)]="box" (ngModelChange)="selected.set(null);loadSessions()" /></app-list-toolbar>
    <app-form-error [message]="error()" />
    <app-tabs label="Vistas de caja" [items]="tabs" [selected]="tab" (selectedChange)="setTab($event)">
    @if(tab==='current'){
      @if(current;as s){<section class="cash-section"><header><h3>{{s.caja_nombre}} · Turno abierto</h3><span>{{s.responsable_nombre}} · {{date(s.apertura)}}</span></header><div class="cash-totals"><div><small>Monto inicial</small><strong>Bs {{s.monto_inicial}}</strong></div><div><small>Efectivo esperado</small><strong>Bs {{s.resumen.esperado}}</strong></div>@for(total of totals(s);track total.name){<div><small>Cobros · {{total.name}}</small><strong>Bs {{total.amount}}</strong></div>}</div>
      <div class="operation-actions">@if(owner(s)&&auth.can('caja.movimientos')){<app-button variant="outline-secondary" icon="add" (clicked)="openOperation('movement')">Registrar movimiento</app-button>}@if(owner(s)&&auth.can('caja.cerrar')){<app-button variant="outline-primary" icon="lock" (clicked)="openOperation('close')">Cerrar turno</app-button>}</div></section>
      }@else{<section class="cash-section"><p>{{occupied ? 'Esta caja tiene un turno abierto por otro operador.' : 'No hay un turno abierto en esta caja.'}}</p>@if(auth.can('caja.abrir')&&box&&!occupied){<app-button icon="add" (clicked)="openOperation('open')">Abrir caja</app-button>}</section>}
    }
    @if(tab==='history'){<app-list-shell [loading]="loading()" [empty]="!sessions.length"><app-table class="cash-table" label="Historial de turnos"><thead><tr><th scope="col">Apertura</th><th scope="col">Fecha y hora de cierre</th><th scope="col">Responsable</th><th scope="col">Estado</th><th scope="col">Efectivo contado</th><th scope="col">Diferencia</th><th scope="col" class="table-actions">Acciones</th></tr></thead><tbody>@for(s of sessions;track s.id){<tr><td>{{date(s.apertura)}}</td><td>{{s.cierre ? date(s.cierre) : '—'}}</td><td>{{s.responsable_nombre}}</td><td><app-badge [state]="s.cierre?'CERRADO':'ABIERTO'" /></td><td>{{s.efectivo_contado||'—'}}</td><td>{{s.diferencia||'—'}}</td><td class="table-actions"><app-button size="sm" variant="outline-secondary" icon="visibility" title="Consultar turno" (clicked)="selectSession(s)" /></td></tr>}</tbody></app-table></app-list-shell>}
    @if(tab!=='history'){
      <app-list-toolbar label="Filtros del turno" [searchEnabled]="false" [total]="tab==='receipts'?receipts.length:filteredMovements.length">
        @if((tab==='movements'||tab==='receipts')&&sessions.length){<app-select toolbar-filter label="Turno" placeholder="Seleccionar" [options]="sessionOptions" [ngModel]="selected()?.id||current?.id||''" (ngModelChange)="selectId($event)" />}
        @if(tab!=='receipts'){<app-select toolbar-filter label="Medio del movimiento" placeholder="Todos" [options]="movementFilters" [(ngModel)]="movementFilter" />}
      </app-list-toolbar>
      @if(tab==='receipts'){<app-list-shell [loading]="detailsLoading()" [empty]="!receipts.length"><app-table class="cash-table" label="Recibos del turno"><thead><tr><th scope="col">Recibo</th><th scope="col">Cliente</th><th scope="col">Medio</th><th scope="col">Importe</th><th scope="col" class="table-actions">Acciones</th></tr></thead><tbody>@for(r of receipts;track r.id){<tr><td>{{r.numero}}</td><td>{{r.datos.cliente.nombre}}</td><td>{{r.datos.medio}}</td><td>Bs {{r.datos.importe}}</td><td class="table-actions"><app-button size="sm" variant="outline-secondary" icon="visibility" title="Ver recibo" (clicked)="receipt.set(r)" /></td></tr>}</tbody></app-table></app-list-shell>}
      @else {<app-list-shell [loading]="loading()||detailsLoading()" [empty]="!filteredMovements.length"><app-table class="cash-table" label="Movimientos del turno"><thead><tr><th scope="col">Fecha</th><th scope="col">Tipo</th><th scope="col">Motivo</th><th scope="col">Operador</th><th scope="col">Importe</th></tr></thead><tbody>@for(m of filteredMovements;track m.id){<tr><td>{{date(m.created_at)}}</td><td>{{m.tipo}} · {{m.medio}}</td><td>{{m.motivo}}</td><td>{{m.actor_nombre}}</td><td>Bs {{m.importe}}</td></tr>}</tbody></app-table></app-list-shell>}
    }
    @if(selected();as s){@if(s.cierre){<section class="cash-section"><h3>Cierre del {{date(s.cierre)}}</h3><div class="cash-totals"><div><small>Esperado</small><strong>Bs {{s.efectivo_esperado}}</strong></div><div><small>Contado</small><strong>Bs {{s.efectivo_contado}}</strong></div><div><small>Diferencia</small><strong>Bs {{s.diferencia}}</strong></div></div><p>{{s.observaciones}}</p></section>}}
    </app-tabs>
  </div>
  <app-modal [open]="!!operation()" [title]="operation()==='open'?'Apertura de caja':operation()==='close'?'Cierre de caja':'Movimiento de efectivo'" icon="payments" [busy]="saving()" (closed)="operation.set('')"><form #form="ngForm" (ngSubmit)="form.valid && save()" novalidate><div class="modal-body operation-form">
    <app-form-error [message]="formError()" [active]="!!operation()" />
    @if(operation()==='movement'){<app-select name="kind" label="Tipo" [options]="movementTypes" [(ngModel)]="kind" [required]="true" />}
    @if(operation()==='close'){<p>Efectivo esperado: Bs {{current?.resumen?.esperado}}</p>}
    <app-input name="amount" type="number" [label]="operation()==='open'?'Efectivo inicial (Bs)':operation()==='close'?'Efectivo contado (Bs)':'Importe (Bs)'" [step]="0.01" [min]="operation()==='movement'?0.01:0" [(ngModel)]="amount" [required]="true" />
    @if(operation()==='movement'||operation()==='close'){<app-textarea name="notes" [label]="operation()==='close'?'Observaciones del cierre':'Motivo'" [(ngModel)]="notes" />}
    @if(operation()==='close'){<p>Diferencia: Bs {{(amount- +(current?.resumen?.esperado||0)).toFixed(2)}}</p>}
  </div><div class="modal-footer"><app-button variant="outline-secondary" [disabled]="saving()" (clicked)="operation.set('')">Cancelar</app-button><app-button type="submit" icon="save" [loading]="saving()" [disabled]="form.invalid||(operation()==='movement'&&!notes.trim())">{{operation()==='close'?'Confirmar cierre':'Guardar'}}</app-button></div></form></app-modal>
  <app-modal [open]="!!receipt()" title="Recibo de pago" size="wide" (closed)="receipt.set(null)"><div class="modal-body"><app-cash-receipt [receipt]="receipt()" /></div></app-modal>
`})
export class CajaComponent {
  private readonly snackbar=inject(SnackbarService);
  branches:{id:number;nombre:string}[]=[];branch='';
  readonly auth=inject(AuthService);private readonly api=inject(CajaService);
  private readonly route=inject(ActivatedRoute);
  private initialSelection=true;
  boxes:CashBox[]=[];methods:PaymentMethod[]=[];sessions:CashSession[]=[];movements:CashMovement[]=[];receipts:Receipt[]=[];box='';tab='current';amount=0;notes='';kind='INGRESO';movementFilter='';
  readonly selected=signal<CashSession|null>(null);readonly receipt=signal<Receipt|null>(null);readonly operation=signal('');readonly loading=signal(false);readonly detailsLoading=signal(false);readonly saving=signal(false);readonly error=signal('');readonly formError=signal('');
  private sequence=0;private detailSequence=0;
  readonly tabs=[{key:'current',label:'Turno actual'},{key:'movements',label:'Movimientos'},{key:'receipts',label:'Recibos'},{key:'history',label:'Historial'}];
  readonly movementTypes=[{value:'INGRESO',label:'Ingreso'},{value:'RETIRO',label:'Retiro'}];
  get boxOptions(){return this.boxes.map(b=>({value:String(b.id),label:b.sucursal_nombre+' · '+b.nombre}));}
  get sessionOptions(){return this.sessions.map(s=>({value:String(s.id),label:this.date(s.apertura)+' · '+(s.cierre?'Cerrado':'Abierto')}));}
  get movementFilters(){return [...new Set([...this.methods.map(m=>m.nombre),...this.movements.map(m=>m.medio)])].map(name=>({value:name,label:name}));}
  get current(){return this.sessions.find(s=>!s.cierre)||null;}
  get occupied(){return !!this.boxes.find(b=>String(b.id)===this.box)?.sesion_actual;}
  get filteredMovements(){return this.movements.filter(m=>!this.movementFilter||m.medio===this.movementFilter);}
  setTab(tab:string){if(tab===this.tab||!this.tabs.some(t=>t.key===tab))return;this.tab=tab;if(tab==='current'){this.selected.set(null);this.loadDetails(this.current);}}
  constructor(){this.load();}
  date(value:string){return new Intl.DateTimeFormat('es-BO',{timeZone:this.boxes.find(b=>String(b.id)===this.box)?.zona_horaria||'America/La_Paz',dateStyle:'short',timeStyle:'short'}).format(new Date(value));}
  owner(s:CashSession){return this.auth.user()?.alcance_global||this.auth.user()?.id===s.responsable;}
  totals(s:CashSession){return Object.entries(s.resumen.cobros_por_medio).map(([name,amount])=>({name,amount}));}
  load(){this.loading.set(true);this.error.set('');this.api.options().subscribe({next:data=>{
    this.boxes=data.cajas;this.methods=data.medios;this.branches=data.sucursales;
    if(this.initialSelection){
      const requested=this.route.snapshot.queryParamMap.get('sucursal');
      const branch=this.branches.find(b=>String(b.id)===requested);
      if(branch){this.branch=String(branch.id);this.box=String(this.boxes.find(b=>b.sucursal===branch.id)?.id||'');}
      else this.box=String(this.boxes[0]?.id||'');
      this.initialSelection=false;
    }else if(!this.boxes.some(b=>String(b.id)===this.box)){
      this.box=String((this.branch?this.boxes.find(b=>String(b.sucursal)===this.branch):this.boxes[0])?.id||'');
    }
    this.loadSessions();
  },error:e=>{this.loading.set(false);this.error.set(apiError(e));}});}
  loadSessions(){const seq=++this.sequence;this.detailSequence++;this.movements=[];this.receipts=[];this.sessions=[];this.detailsLoading.set(false);if(!this.box){this.selected.set(null);this.loading.set(false);this.error.set('');return;}this.loading.set(true);this.error.set('');this.api.sessions(Number(this.box)).subscribe({next:rows=>{if(seq!==this.sequence)return;this.sessions=rows;const id=this.selected()?.id;this.selected.set(rows.find(s=>s.id===id)||null);this.loading.set(false);this.loadDetails(this.selected()||this.current);},error:e=>{if(seq===this.sequence){this.loading.set(false);this.error.set(apiError(e));}}});}
  selectId(id:string){const s=this.sessions.find(s=>s.id===Number(id))||null;this.selected.set(s);this.loadDetails(s||this.current);}
  selectSession(s:CashSession){this.selected.set(s);this.tab='movements';this.loadDetails(s);}
  loadDetails(s:CashSession|null){
    const seq=++this.detailSequence;this.movements=[];this.receipts=[];
    const sessionId=s?.id||this.boxes.find(b=>String(b.id)===this.box)?.sesion_actual;
    if(!sessionId){this.detailsLoading.set(false);return;}
    this.detailsLoading.set(true);let pending=s?2:1;
    const done=()=>{if(seq===this.detailSequence&&!--pending)this.detailsLoading.set(false);};
    // A foreign turn exposes only receipts authorized by the backend, never its movements.
    if(s)this.api.movements(s.id).subscribe({next:rows=>{if(seq===this.detailSequence)this.movements=rows;done();},error:e=>{if(seq===this.detailSequence)this.error.set(apiError(e));done();}});
    this.api.receipts(sessionId).subscribe({next:rows=>{if(seq===this.detailSequence)this.receipts=rows;done();},error:e=>{if(seq===this.detailSequence)this.error.set(apiError(e));done();}});
  }
  openOperation(kind:string){
    if(this.saving()||!['open','close','movement'].includes(kind))return;
    if(kind==='open'&&(!this.box||this.occupied||!this.auth.can('caja.abrir')))return;
    if(kind!=='open'&&(!this.current||!this.owner(this.current)||!this.auth.can(kind==='close'?'caja.cerrar':'caja.movimientos')))return;
    this.operation.set(kind);this.formError.set('');this.amount=kind==='close'?Number(this.current?.resumen.esperado||0):0;this.notes='';this.kind='INGRESO';
  }
  save(){if(this.saving())return;const kind=this.operation();
    if(!['open','close','movement'].includes(kind))return;
    if(kind==='open'&&(!this.box||this.occupied)||kind!=='open'&&!this.current)return;
    this.saving.set(true);this.formError.set('');const req:Observable<unknown>=kind==='open'?this.api.open(Number(this.box),this.amount):kind==='close'?this.api.close(this.current!.id,{efectivo_contado:this.amount,observaciones:this.notes}):this.api.move(this.current!.id,{tipo:this.kind,importe:this.amount,motivo:this.notes});req.subscribe({next:()=>{this.snackbar.success(kind==='open' ? 'Turno de caja abierto correctamente.' : kind==='close' ? 'Turno de caja cerrado correctamente.' : 'Movimiento registrado correctamente.');this.saving.set(false);this.operation.set('');this.selected.set(null);this.load();},error:e=>{this.saving.set(false);this.formError.set(apiError(e));}});}
}
