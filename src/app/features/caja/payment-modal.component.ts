import { Component, effect, inject, input, output, signal } from '@angular/core';
import { RESERVAS_UI } from '../reservas/reservas-ui';
import { Reservation, apiError } from '../reservas/reservas.service';
import { CajaService, CashBox, PaymentMethod, Receipt } from './caja.service';
import { ReceiptComponent } from './receipt.component';
import { AuthService } from '../../core/services/auth.service';

@Component({selector:'app-payment-modal',imports:[...RESERVAS_UI,ReceiptComponent],styleUrl:'../reservas/reservas.component.css',template:`
  <app-modal [open]="!!reservation()" title="Cobrar reserva" icon="payments" [busy]="busy()" (closed)="close()">
    @if(reservation();as r){<form #form="ngForm" (ngSubmit)="pay()"><fieldset class="modal-body operation-form" [disabled]="busy()" style="border:0">
      @if(error()){<div class="alert alert-danger" role="alert">{{error()}}</div>}
      <strong>{{r.detalle.cancha_nombre}} · {{r.cliente_snapshot.nombre}}</strong><p>Total a pagar: <strong>Bs {{r.total}}</strong></p>
      <app-select name="session" label="Caja abierta" placeholder="Seleccionar" [options]="boxOptions" [(ngModel)]="session" [required]="true" (ngModelChange)="changed()" />
      @if(!boxes.length){<div class="alert alert-warning">No hay una caja abierta en esta sucursal.</div>}
      <app-select name="method" label="Medio de pago" placeholder="Seleccionar" [options]="methodOptions" [(ngModel)]="medium" [required]="true" (ngModelChange)="methodChanged()" />
      @if(cash){<app-input name="received" type="number" label="Efectivo recibido (Bs)" [step]="0.01" [min]="+r.total" [(ngModel)]="received" [required]="true" (ngModelChange)="changed()" /><p>Cambio: Bs {{change}}</p>}
      @else {<app-input name="reference" label="Referencia de la operacion" [(ngModel)]="reference" [required]="true" (ngModelChange)="changed()" /><app-checkbox name="verified" label="Pago verificado por el operador" [(ngModel)]="verified" (ngModelChange)="changed()" />}
      @if(canStart){<app-checkbox name="start" label="Iniciar servicio despues del cobro" [(ngModel)]="startService" (ngModelChange)="changed()" />}
    </fieldset><div class="modal-footer"><app-button variant="outline-secondary" [disabled]="busy()" (clicked)="close()">Cancelar</app-button><app-button type="submit" icon="payments" [loading]="busy()" [disabled]="form.invalid || !boxes.length || (!cash && !verified)">Cobrar total</app-button></div></form>}
  </app-modal>
  <app-modal [open]="!!receipt()" title="Recibo de pago" size="wide" (closed)="receipt.set(null)"><div class="modal-body"><app-cash-receipt [receipt]="receipt()" />@if(error()){<div class="alert alert-warning">{{error()}}</div>}</div></app-modal>
`})
export class PaymentModalComponent {
  readonly reservation=input<Reservation|null>(null); readonly closed=output<void>(); readonly paid=output<Receipt>();
  private readonly api=inject(CajaService);
  private readonly auth=inject(AuthService);
  readonly busy=signal(false); readonly error=signal(''); readonly receipt=signal<Receipt|null>(null);
  boxes:CashBox[]=[];methods:PaymentMethod[]=[];session='';medium='';received=0;reference='';verified=false;startService=false;key='';
  get cash(){return this.methods.find(m=>String(m.id)===this.medium)?.efectivo||false;}
  get canStart(){const r=this.reservation();return !!r && this.auth.can('reservas.iniciar') && Date.parse(r.detalle.inicio)<=Date.now() && Date.now()<Date.parse(r.detalle.fin);}
  get boxOptions(){return this.boxes.map(b=>({value:String(b.sesion_actual),label:b.nombre}));}
  get methodOptions(){return this.methods.map(m=>({value:String(m.id),label:m.nombre}));}
  get change(){return Math.max(0,this.received-Number(this.reservation()?.total||0)).toFixed(2);}
  constructor(){effect(()=>{const r=this.reservation();if(!r)return;this.error.set('');this.boxes=[];this.session='';this.medium='';this.received=Number(r.total);this.reference='';this.verified=false;this.startService=false;this.changed();
    this.api.options().subscribe({next:data=>{if(this.reservation()?.id!==r.id)return;this.boxes=data.cajas.filter(b=>b.sucursal===r.sucursal&&b.sesion_actual);this.methods=data.medios;this.session=String(this.boxes[0]?.sesion_actual||'');this.medium=String(this.methods[0]?.id||'');},error:e=>this.error.set(apiError(e))});});}
  changed(){this.key=crypto.randomUUID();}
  methodChanged(){this.received=Number(this.reservation()?.total||0);this.reference='';this.verified=false;this.changed();}
  close(){if(!this.busy())this.closed.emit();}
  pay(){const r=this.reservation();if(!r||this.busy()||!this.session||!this.medium)return;this.busy.set(true);this.error.set('');
    this.api.charge({sesion:Number(this.session),reserva:r.id,medio:Number(this.medium),clave:this.key,importe:r.total,recibido:this.cash?this.received:r.total,referencia:this.reference,verificado:this.verified,iniciar:this.startService&&this.canStart}).subscribe({next:receipt=>{this.busy.set(false);this.receipt.set(receipt);this.paid.emit(receipt);this.closed.emit();},error:e=>{this.busy.set(false);this.error.set(apiError(e));}});}
}
