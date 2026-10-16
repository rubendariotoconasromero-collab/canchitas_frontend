import { Component, effect, inject, input, output, signal } from '@angular/core';
import { RESERVAS_UI } from '../reservas/reservas-ui';
import { Reservation, apiError } from '../reservas/reservas.service';
import { CajaService, CashBox, PaymentMethod, Receipt } from './caja.service';
import { ReceiptComponent } from './receipt.component';
import { AuthService } from '../../core/services/auth.service';
import { SnackbarService } from '../../core/services/snackbar.service';

interface PaymentEntry {
  id: string;
  medio: string;
  importe: number;
  recibido: number;
  referencia: string;
  verificado: boolean;
}

@Component({selector:'app-payment-modal',imports:[...RESERVAS_UI,ReceiptComponent],styleUrls:['../reservas/reservas.component.css','./payment-modal.component.css'],template:`
  <app-modal [open]="!!reservation()" title="Cobrar reserva" icon="payments" [busy]="busy()" (closed)="close()">
    @if(reservation();as r){<form #form="ngForm" (ngSubmit)="form.valid && validBreakdown && pay()" novalidate><fieldset class="modal-body operation-form" [disabled]="busy()" style="border:0">
      <app-form-error [message]="error()" />
      <strong>{{r.detalle.cancha_nombre}} · {{r.cliente_snapshot.nombre}}</strong>
      <div class="payment-total"><span>Total de la reserva</span><strong>Bs {{money(+r.total)}}</strong></div>
      <app-select name="session" label="Caja abierta" placeholder="Seleccionar" [options]="boxOptions" [(ngModel)]="session" [required]="true" (ngModelChange)="changed()" />
      @if(!boxes.length){<div class="alert alert-warning">No hay una caja abierta en esta sucursal.</div>}
      <div class="payment-lines-heading"><h3>Distribución del pago</h3><app-button variant="outline-secondary" size="sm" icon="add" (clicked)="addLine()">Agregar medio</app-button></div>
      @for(line of lines;track line.id;let index=$index){
        <section class="payment-line">
          <header><strong>Medio {{index+1}}</strong>@if(lines.length>1){<app-button variant="outline-danger" size="sm" icon="close" title="Quitar medio de pago" (clicked)="removeLine(line.id)" />}</header>
          <app-select [name]="'method-'+line.id" label="Forma de pago" placeholder="Seleccionar" [options]="methodOptions" [(ngModel)]="line.medio" [required]="true" (ngModelChange)="methodChanged(line)" />
          <app-input [name]="'amount-'+line.id" type="number" label="Importe aplicado (Bs)" [step]="0.01" [min]="0.01" [(ngModel)]="line.importe" [required]="true" (ngModelChange)="amountChanged(line)" />
          @if(isCash(line)){
            <app-input [name]="'received-'+line.id" type="number" label="Efectivo recibido (Bs)" [step]="0.01" [min]="line.importe" [(ngModel)]="line.recibido" [required]="true" (ngModelChange)="changed()" />
            <p class="payment-change">Cambio de esta parte: Bs {{money(change(line))}}</p>
          }@else if(line.medio){
            <app-input [name]="'reference-'+line.id" label="Referencia de la operación" [(ngModel)]="line.referencia" [required]="true" (ngModelChange)="changed()" />
            <app-checkbox [name]="'verified-'+line.id" label="Transferencia QR verificada" [(ngModel)]="line.verificado" (ngModelChange)="changed()" />
          }
        </section>
      }
      <div class="payment-balance" [class.payment-balance-complete]="remainingCents===0">
        <span>{{remainingCents>0?'Falta cubrir':remainingCents<0?'Exceso':'Distribuido'}}</span>
        <strong>Bs {{money(remainingAmount)}}</strong>
      </div>
      @if(canStart){<app-checkbox name="start" label="Iniciar servicio después del cobro" [(ngModel)]="startService" (ngModelChange)="changed()" />}
    </fieldset><div class="modal-footer"><app-button variant="outline-secondary" [disabled]="busy()" (clicked)="close()">Cancelar</app-button><app-button type="submit" icon="payments" [loading]="busy()" [disabled]="form.invalid || !boxes.length || !validBreakdown">Cobrar total</app-button></div></form>}
  </app-modal>
  <app-modal [open]="!!receipt()" title="Recibo de pago" size="wide" (closed)="receipt.set(null)"><div class="modal-body"><app-cash-receipt [receipt]="receipt()" />@if(error()){<div class="alert alert-warning">{{error()}}</div>}</div></app-modal>
`})
export class PaymentModalComponent {
  private readonly snackbar=inject(SnackbarService);
  readonly reservation=input<Reservation|null>(null); readonly closed=output<void>(); readonly paid=output<Receipt>();
  private readonly api=inject(CajaService);
  private readonly auth=inject(AuthService);
  readonly busy=signal(false); readonly error=signal(''); readonly receipt=signal<Receipt|null>(null);
  boxes:CashBox[]=[];methods:PaymentMethod[]=[];session='';lines:PaymentEntry[]=[];startService=false;key='';
  get canStart(){const r=this.reservation();return !!r && this.auth.can('reservas.iniciar') && Date.parse(r.detalle.inicio)<=Date.now() && Date.now()<Date.parse(r.detalle.fin);}
  get boxOptions(){return this.boxes.map(b=>({value:String(b.sesion_actual),label:b.nombre}));}
  get methodOptions(){return this.methods.map(m=>({value:String(m.id),label:m.nombre}));}
  get allocatedCents(){return this.lines.reduce((sum,line)=>sum+this.cents(line.importe),0);}
  get remainingCents(){return this.cents(+(this.reservation()?.total||0))-this.allocatedCents;}
  get remainingAmount(){return Math.abs(this.remainingCents)/100;}
  get validBreakdown(){
    const total=this.cents(+(this.reservation()?.total||0));
    return this.lines.length>0 && this.remainingCents===0 && this.lines.every(line=>{
      const method=this.methods.find(item=>String(item.id)===line.medio);
      if(!method||this.cents(line.importe)<=0)return false;
      return method.efectivo
        ? Number.isFinite(Number(line.recibido))&&this.cents(line.recibido)>=this.cents(line.importe)
        : !!line.verificado&&!!line.referencia.trim()&&this.cents(line.recibido)===this.cents(line.importe);
    })&&this.allocatedCents===total;
  }
  constructor(){effect(()=>{const r=this.reservation();if(!r)return;this.error.set('');this.boxes=[];this.session='';this.lines=[];this.startService=false;this.changed();
    this.api.options().subscribe({next:data=>{if(this.reservation()?.id!==r.id)return;this.boxes=data.cajas.filter(b=>b.sucursal===r.sucursal&&b.sesion_actual);this.methods=data.medios;this.session=String(this.boxes[0]?.sesion_actual||'');const first=this.methods[0];this.lines=[this.newLine(first?String(first.id):'',Number(r.total))];},error:e=>this.error.set(apiError(e))});});}
  private newLine(medio:string,importe:number):PaymentEntry{return{id:crypto.randomUUID(),medio,importe,recibido:importe,referencia:'',verificado:false};}
  private cents(value:number){return Number.isFinite(Number(value))?Math.round(Number(value)*100):0;}
  money(value:number){return Number(value||0).toFixed(2);}
  isCash(line:PaymentEntry){return this.methods.find(m=>String(m.id)===line.medio)?.efectivo||false;}
  change(line:PaymentEntry){return Math.max(0,this.cents(line.recibido)-this.cents(line.importe))/100;}
  changed(){this.key=crypto.randomUUID();}
  amountChanged(line:PaymentEntry){
    if(!this.isCash(line))line.recibido=Number(line.importe)||0;
    const last=this.lines[this.lines.length-1];
    if(this.lines.length>1&&last.id!==line.id){
      const others=this.lines.filter(item=>item.id!==last.id).reduce((sum,item)=>sum+this.cents(item.importe),0);
      last.importe=Math.max(0,this.cents(+(this.reservation()?.total||0))-others)/100;
      if(!this.isCash(last))last.recibido=last.importe;
    }
    this.changed();
  }
  methodChanged(line:PaymentEntry){line.referencia='';line.verificado=false;line.recibido=Number(line.importe)||0;this.changed();}
  addLine(){const amount=Math.max(0,this.remainingCents)/100;this.lines=[...this.lines,this.newLine(this.methods[0]?String(this.methods[0].id):'',amount)];this.changed();}
  removeLine(id:string){
    if(this.lines.length<=1)return;
    this.lines=this.lines.filter(line=>line.id!==id);
    const last=this.lines[this.lines.length-1];
    const others=this.lines.filter(line=>line.id!==last.id).reduce((sum,line)=>sum+this.cents(line.importe),0);
    last.importe=Math.max(0,this.cents(+(this.reservation()?.total||0))-others)/100;
    if(!this.isCash(last))last.recibido=last.importe;
    this.changed();
  }
  close(){if(!this.busy())this.closed.emit();}
  pay(){const r=this.reservation();if(!r||this.busy()||!this.session||!this.validBreakdown)return;
    this.busy.set(true);this.error.set('');
    this.api.charge({sesion:Number(this.session),reserva:r.id,clave:this.key,importe:r.total,
      pagos:this.lines.map(line=>({medio:Number(line.medio),importe:this.money(line.importe),
        recibido:this.money(this.isCash(line)?line.recibido:line.importe),referencia:line.referencia.trim(),verificado:line.verificado})),
      iniciar:this.startService&&this.canStart}).subscribe({next:receipt=>{this.snackbar.success('Cobro registrado y recibo emitido correctamente.');this.busy.set(false);this.receipt.set(receipt);this.paid.emit(receipt);this.closed.emit();},error:e=>{this.busy.set(false);this.error.set(apiError(e));}});}
}
