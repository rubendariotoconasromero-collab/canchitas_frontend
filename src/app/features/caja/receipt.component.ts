import { Component, input } from '@angular/core';
import { Receipt } from './caja.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({selector:'app-cash-receipt',imports:[ButtonComponent],styleUrl:'./receipt.component.css',template:`
  @if(receipt();as r){<article class="cash-receipt" id="cash-print-receipt">
    <header><h2>{{r.datos.negocio}}</h2><p>Recibo interno · {{r.numero}}</p><small>No es factura fiscal</small></header>
    <dl>
      <div><dt>Sucursal / caja</dt><dd>{{r.datos.sucursal}} / {{r.datos.caja}}</dd></div>
      <div><dt>Fecha</dt><dd>{{date(r.created_at,r.datos.zona_horaria)}}</dd></div>
      <div><dt>Cliente</dt><dd>{{r.datos.cliente.nombre}}</dd></div>
      <div><dt>Cancha / deporte</dt><dd>{{r.datos.cancha}} / {{r.datos.deporte}}</dd></div>
      <div><dt>Horario</dt><dd>{{date(r.datos.inicio,r.datos.zona_horaria)}} - {{date(r.datos.fin,r.datos.zona_horaria)}}</dd></div>
      <div><dt>Formas de pago</dt><dd>
        @if(r.datos.medios?.length){
          @for(line of r.datos.medios;track $index){
            <span class="receipt-payment-line">{{line.medio}} · Bs {{line.importe}}@if(line.efectivo){ · Recibido Bs {{line.recibido}} · Cambio Bs {{line.cambio}}}@else if(line.referencia){ · Ref. {{line.referencia}} · Verificado}</span>
          }
        }@else{
          {{r.datos.medio}}
        }
      </dd></div>
      <div><dt>Operador</dt><dd>{{r.datos.operador}}</dd></div>
    </dl>
    <div class="receipt-total">Total pagado <strong>Bs {{r.datos.importe}}</strong></div><p>Recibido: Bs {{r.recibido}} · Cambio: Bs {{r.cambio}}</p>@if(r.referencia_externa&&!r.datos.medios?.length){<p>Referencia: {{r.referencia_externa}}</p>}<small>Reserva {{r.codigo_reserva || r.datos.codigo_reserva}}</small>@if(r.codigo_pago){<p>Pago {{r.codigo_pago}}</p>}<p>Cancelaciones sin reembolso.</p>
  </article><div class="receipt-print-action"><app-button (clicked)="print()">Imprimir recibo</app-button></div>}
`})
export class ReceiptComponent {
  readonly receipt=input<Receipt|null>(null);
  date(value:string,zone:string){return new Intl.DateTimeFormat('es-BO',{timeZone:zone,dateStyle:'short',timeStyle:'short'}).format(new Date(value));}
  print(){window.print();}
}
