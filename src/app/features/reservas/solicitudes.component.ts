import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { RESERVAS_UI } from './reservas-ui';
import { DropdownComponent, DropdownItemComponent } from '../../shared/components/dropdown';
import { AuthService } from '../../core/services/auth.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ReservasService, Branch, Cliente, Reservation, apiError } from './reservas.service';
import { Solicitud, SolicitudesService } from './solicitudes.service';
import { PublicQuote, requestLabels } from '../publico/public.service';
import { PaymentModalComponent } from '../caja/payment-modal.component';
import { hasPendingPayment } from './agenda.utils';

@Component({selector:'app-solicitudes',imports:[...RESERVAS_UI,DropdownComponent,DropdownItemComponent,PaymentModalComponent],styleUrl:'./reservas.component.css',template:`
  <div class="main-content">
    <app-page-header title="Solicitudes web" icon="inbox" backRoute="/agenda" />
    <app-list-toolbar searchLabel="Buscar solicitud" searchPlaceholder="Codigo, cliente, telefono o cancha" [(query)]="query" [total]="filtered().length" [showRefresh]="true" [loading]="loading()" (refreshed)="load()">
      <app-select toolbar-filter label="Sucursal" placeholder="Todas" [options]="branchOptions" [(ngModel)]="branch" />
      <app-select toolbar-filter label="Estado" placeholder="Todos" [options]="stateOptions" [(ngModel)]="state" />
    </app-list-toolbar>
    <app-list-shell [loading]="loading()" [error]="loadError()" [empty]="!filtered().length" (retry)="load()">
      <app-table label="Solicitudes de alquiler" minWidth="850px"><thead><tr>
        <th scope="col">Horario</th><th scope="col">Cancha</th><th scope="col">Cliente</th><th scope="col">Total cotizado</th><th scope="col">Estado</th><th scope="col" class="text-center">Acciones</th>
      </tr></thead><tbody>@for(row of filtered();track row.id){<tr>
        <td>{{date(row.inicio,row.zona_horaria)}}<br><small>{{date(row.fin,row.zona_horaria)}}</small><br><small>{{row.codigo_correlativo || row.codigo}}</small></td><td>{{row.cancha}}<br><small>{{row.deporte}}</small></td>
        <td>{{row.nombre}}<br><small>{{row.telefono}}</small></td><td>Bs {{row.total_cotizado}}</td>
        <td><app-badge [label]="labels[row.estado] || row.estado" [tone]="row.estado==='ACEPTADA'?'success':row.estado==='PENDIENTE'?'warning':'neutral'" /></td>
        <td class="text-center"><app-dropdown [title]="'Acciones para ' + row.nombre"><app-dropdown-item label="Ver solicitud" icon="visibility" (clicked)="open(row)" /></app-dropdown></td>
      }</tbody></app-table>
    </app-list-shell>
  </div>
  <app-modal [open]="!!selected()" title="Solicitud de alquiler" icon="inbox" [busy]="busy()" (closed)="close()">
    @if(selected();as row){<div class="modal-body operation-form">
      <app-form-error [message]="error()" />
      <p><strong>Solicitud {{row.codigo_correlativo || row.codigo}}</strong></p>
      <strong>{{row.cancha}} · {{row.deporte}}</strong><p>{{date(row.inicio,row.zona_horaria)}} - {{date(row.fin,row.zona_horaria)}}</p>
      <p>{{row.nombre}} · {{row.telefono}}<br>{{row.correo}}</p><p>{{row.notas}}</p>
      <p>Total solicitado: <strong>Bs {{row.total_cotizado}}</strong></p><app-badge [label]="labels[row.estado] || row.estado" />
      @if(row.condiciones_snapshot.condiciones){<p>Condiciones aceptadas al solicitar: {{row.condiciones_snapshot.condiciones}}</p>}
      @if(row.estado==='PENDIENTE'){
        @if(auth.can('solicitudes.aceptar')){
          <form #acceptForm="ngForm" (ngSubmit)="acceptForm.valid && accept()" novalidate class="operation-form">
            <app-search-select name="client" label="Cliente de la reserva" [options]="clientOptions" [(ngModel)]="client" [required]="true" [disabled]="busy()" />
            <app-button variant="outline-primary" icon="calculate" [loading]="quoting()" [disabled]="busy()" (clicked)="cotizar()">Validar disponibilidad y precio</app-button>
            @if(quotation();as q){<p>Total actualizado: <strong>Bs {{q.total}}</strong></p>
              @if(q.total!==row.total_cotizado || q.condiciones!==row.condiciones_snapshot.condiciones || q.horas_cancelacion!==row.condiciones_snapshot.horas_cancelacion){<div class="alert alert-warning">El precio o las condiciones cambiaron. Verifica con el cliente antes de aceptar.</div>}
              <p>{{q.condiciones}}</p><p>Cancelaciones hasta {{q.horas_cancelacion}} horas antes, sin reembolsos.</p>
              <p>Al aceptar se apartara el horario por {{q.plazo_pago_minutos}} minutos, o hasta el inicio del servicio si ocurre antes. El pago total confirma la reserva.</p>
            }
            <app-button type="submit" icon="check" [loading]="busy()" [disabled]="acceptForm.invalid || !quotation() || quoting()">Aceptar solicitud</app-button>
          </form>
        }
        @if(auth.can('solicitudes.rechazar')){
          <form #rejectForm="ngForm" (ngSubmit)="rejectForm.valid && reject()" novalidate class="operation-form">
            <app-input name="reason" label="Motivo de rechazo (visible para el cliente)" [(ngModel)]="reason" [required]="true" [disabled]="busy()" />
            <app-button type="submit" icon="close" variant="outline-danger" [loading]="busy()" [disabled]="rejectForm.invalid || !reason.trim() || quoting()">Rechazar solicitud</app-button>
          </form>
        }
      }
      @if(row.motivo){<p>Motivo: {{row.motivo}}</p>}
      @if(row.reserva && auth.can('reservas.ver')){<app-button variant="outline-secondary" icon="event" [loading]="busy()" (clicked)="viewReservation(row.reserva)">Ver reserva asociada</app-button>}
    </div><div class="modal-footer"><app-button variant="outline-secondary" [disabled]="busy()" (clicked)="close()">Cerrar</app-button></div>}
  </app-modal>
  <app-modal [open]="!!reservation()" title="Reserva de solicitud web" icon="event" (closed)="reservation.set(null)">
    @if(reservation();as r){<div class="modal-body operation-form"><strong>{{r.detalle.cancha_nombre}}</strong><p>{{r.cliente_snapshot.nombre}} · {{r.codigo_correlativo || r.codigo}}</p>
      <app-badge [state]="r.estado" /><p>Total: <strong>Bs {{r.total}}</strong> · Pagado: Bs {{r.total_pagado}}</p>
      @if(pending(r)){<div class="alert alert-warning">Pago total pendiente. Plazo: {{date(r.retencion_hasta,r.detalle.zona_horaria)}}.</div>}
    </div><div class="modal-footer">
      @if(pending(r) && auth.can('caja.cobrar')){<app-button icon="payments" (clicked)="payment.set(r); reservation.set(null)">Cobrar total</app-button>}
      <app-button variant="outline-secondary" (clicked)="reservation.set(null)">Cerrar</app-button>
    </div>}
  </app-modal>
  <app-payment-modal [reservation]="payment()" (closed)="payment.set(null)" (paid)="paid()" />
`})
export class SolicitudesComponent {
  readonly auth=inject(AuthService); private readonly api=inject(SolicitudesService); private readonly clientsApi=inject(ReservasService); private readonly snackbar=inject(SnackbarService);
  readonly rows=signal<Solicitud[]>([]);readonly loading=signal(false);readonly loadError=signal('');readonly busy=signal(false);readonly error=signal('');readonly quoting=signal(false);
  readonly query=signal('');readonly branch=signal('');readonly state=signal('');readonly selected=signal<Solicitud|null>(null);readonly quotation=signal<PublicQuote|null>(null);
  readonly reservation=signal<Reservation|null>(null);readonly payment=signal<Reservation|null>(null);readonly labels=requestLabels;readonly pending=hasPendingPayment;
  branches:Branch[]=[];clients:Cliente[]=[];client='';reason='';private loadVersion=0;private detailVersion=0;
  readonly stateOptions=Object.entries(requestLabels).map(([value,label])=>({value,label}));
  readonly filtered=computed(()=>{const q=this.query().trim().toLowerCase();return this.rows().filter(r=>(!this.branch() || String(r.sucursal)===this.branch()) && (!this.state() || r.estado===this.state()) && `${r.codigo_correlativo || ''} ${r.codigo} ${r.nombre} ${r.telefono} ${r.cancha}`.toLowerCase().includes(q));});
  get branchOptions(){return this.branches.map(b=>({value:String(b.id),label:b.nombre}));}
  get clientOptions(){return [...(this.auth.can('clientes.crear')?[{value:'new',label:'Registrar cliente con los datos de la solicitud'}]:[]),...this.clients.map(c=>({value:String(c.id),label:`${c.nombre} · ${c.telefono}`}))];}
  private readonly route=inject(ActivatedRoute);private navigationSubscription?:Subscription;private noticeVersion=0;
  ngOnDestroy(){this.navigationSubscription?.unsubscribe();this.noticeVersion++;this.loadVersion++;this.detailVersion++;}
  constructor(){this.api.branches().subscribe({next:b=>{this.branches=b;this.navigationSubscription=this.route.queryParamMap.subscribe(params=>{
    const selected=b.find(row=>String(row.id)===params.get('sucursal'));this.branch.set(selected?String(selected.id):'');
    const version=++this.noticeVersion,id=Number(params.get('solicitud'));
    if(Number.isInteger(id)&&id>0){this.selected.set(null);this.api.detail(id).subscribe({next:row=>{if(version===this.noticeVersion)this.open(row);},error:e=>{if(version===this.noticeVersion)this.loadError.set(apiError(e));}});}
  });},error:e=>this.loadError.set(apiError(e))});this.load();}
  date(value:string,zone:string){return new Intl.DateTimeFormat('es-BO',{timeZone:zone,dateStyle:'short',timeStyle:'short',hour12:false}).format(new Date(value));}
  load(){const version=++this.loadVersion;this.loading.set(true);this.loadError.set('');this.api.list().subscribe({next:rows=>{if(version!==this.loadVersion)return;this.rows.set(rows);this.loading.set(false);},error:e=>{if(version!==this.loadVersion)return;this.loading.set(false);this.loadError.set(apiError(e));}});}
  open(row:Solicitud){if(this.busy())return;const version=++this.detailVersion;this.selected.set(row);this.quotation.set(null);this.quoting.set(false);this.error.set('');this.reason='';this.clients=[];this.client=this.auth.can('clientes.crear')?'new':'';
    if(this.auth.can('clientes.ver'))this.clientsApi.clients(String(row.sucursal)).subscribe({next:rows=>{if(version===this.detailVersion)this.clients=rows;},error:e=>{if(version===this.detailVersion)this.error.set(apiError(e));}});
  }
  close(){if(this.busy())return;this.detailVersion++;this.selected.set(null);this.quotation.set(null);this.quoting.set(false);}
  cotizar(){const row=this.selected();if(!row||this.busy()||this.quoting()||!this.auth.can('solicitudes.aceptar'))return;const version=this.detailVersion;this.quoting.set(true);this.quotation.set(null);this.error.set('');this.api.quote(row.id).subscribe({next:q=>{if(version!==this.detailVersion)return;this.quotation.set(q);this.quoting.set(false);},error:e=>{if(version!==this.detailVersion)return;this.quoting.set(false);this.error.set(apiError(e));}});}
  accept(){const row=this.selected(),q=this.quotation();if(!row||!q||!this.client||this.busy()||this.quoting()||!this.auth.can('solicitudes.aceptar'))return;this.busy.set(true);this.error.set('');
    this.api.accept(row.id,q,this.client==='new'?'':this.client).subscribe({next:r=>{this.busy.set(false);this.close();this.reservation.set(r.reserva);this.snackbar.success('Solicitud aceptada. La reserva queda pendiente del pago total.');this.load();},error:e=>{this.busy.set(false);this.quotation.set(null);this.error.set(apiError(e));}});
  }
  reject(){const row=this.selected();if(!row||!this.reason.trim()||this.reason.trim().length>255||this.busy()||this.quoting()||!this.auth.can('solicitudes.rechazar'))return;this.busy.set(true);this.error.set('');this.api.reject(row.id,this.reason.trim()).subscribe({next:()=>{this.busy.set(false);this.close();this.snackbar.success('Solicitud rechazada.');this.load();},error:e=>{this.busy.set(false);this.error.set(apiError(e));}});}
  viewReservation(id:number){if(this.busy())return;this.busy.set(true);this.error.set('');this.api.reservation(id).subscribe({next:r=>{this.busy.set(false);this.close();this.reservation.set(r);},error:e=>{this.busy.set(false);this.error.set(apiError(e));}});}
  paid(){this.payment.set(null);this.reservation.set(null);this.load();}
}
