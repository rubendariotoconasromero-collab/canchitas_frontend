import { Component, computed, inject, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ReservasService, Agenda, Branch, CourtLink, CourtOption, Cliente, Reservation, Block, Quote, Span, apiError } from './reservas.service';
import { RESERVAS_UI } from './reservas-ui';
import { freeIntervals, hasPendingPayment, localDate, reservationActionLabel, shiftDay } from './agenda.utils';
import { ClienteEditorComponent } from './cliente-editor.component';
import { ReservationCalendarComponent } from './reservation-calendar.component';
import { PaymentModalComponent } from '../caja/payment-modal.component';
import { calendarRange, moveCalendarDay, CalendarView, CalendarSelection } from './reservation-calendar.utils';
import { SnackbarService } from '../../core/services/snackbar.service';

@Component({selector:'app-agenda', imports:[...RESERVAS_UI, ClienteEditorComponent, ReservationCalendarComponent,PaymentModalComponent], styleUrls:['./reservas.component.css','./agenda.component.css'], template:`
  <div class="main-content agenda-page">
    <app-page-header title="Agenda de reservas" icon="calendar_month">
      @if(auth.can('clientes.ver')) { <app-button-link route="/clientes" icon="contact_phone" variant="outline-secondary">Clientes</app-button-link> }
      @if(auth.can('bloqueos.crear')) { <app-button variant="outline-secondary" icon="lock" (clicked)="openForm('block')">Bloquear cancha</app-button> }
      @if(auth.can('reservas.crear')) { <app-button icon="add" (clicked)="openForm('reserve')">Nueva reserva</app-button> }
    </app-page-header>
    <app-list-toolbar label="Filtros de agenda" [searchEnabled]="false" [showRefresh]="true" [loading]="loading()" refreshLabel="Actualizar agenda" (refreshed)="load()">
      <div toolbar-filter>
        @if(branches.length>1){<app-select label="Sucursal" [options]="branchOptions" [(ngModel)]="branch" (ngModelChange)="branchChanged()" />}
        @else{<app-filter-context label="Sucursal" [value]="selectedBranchName || 'Sin sucursal disponible'" />}
      </div>
      <app-search-select toolbar-filter label="Cancha" [options]="courtOptions" placeholder="Todas" [(ngModel)]="court" (ngModelChange)="load()" />
      <app-input toolbar-filter type="date" label="Fecha" [(ngModel)]="day" (ngModelChange)="load()" />
      <app-select toolbar-filter label="Estado de reserva" [options]="stateOptions" placeholder="Todos" [(ngModel)]="state" />
    </app-list-toolbar>
    <div class="agenda-period">
      <div class="agenda-period-navigation">
        <app-button variant="outline-secondary" size="sm" icon="keyboard_double_arrow_left" title="Periodo anterior" (clicked)="navigatePeriod(-1)" />
        <h3>{{periodLabel}}</h3>
        <app-button variant="outline-secondary" size="sm" icon="keyboard_double_arrow_right" title="Periodo siguiente" (clicked)="navigatePeriod(1)" />
        <app-button variant="outline-secondary" size="sm" (clicked)="today()">Hoy</app-button>
      </div>
      <div class="agenda-period-tools">
        <div class="segmented" role="group" aria-label="Presentacion de agenda"><button type="button" [class.selected]="!calendarMode" [attr.aria-pressed]="!calendarMode" (click)="setPresentation(false)">Listado</button><button type="button" [class.selected]="calendarMode" [attr.aria-pressed]="calendarMode" (click)="setPresentation(true)">Calendario</button></div>
        <div class="segmented" role="group" aria-label="Periodo de agenda"><button type="button" [class.selected]="calendarMode ? calendarView==='day' : days===1" [attr.aria-pressed]="calendarMode ? calendarView==='day' : days===1" (click)="setPeriod('day')">Dia</button><button type="button" [class.selected]="calendarMode ? calendarView==='week' : days===7" [attr.aria-pressed]="calendarMode ? calendarView==='week' : days===7" (click)="setPeriod('week')">Semana</button>@if(calendarMode) {<button type="button" [class.selected]="calendarView==='month'" [attr.aria-pressed]="calendarView==='month'" (click)="setPeriod('month')">Mes</button>}</div>
      </div>
    </div>
    <app-form-error [message]="message()" />
    @if(calendarMode) {
      @if(loading()) {<p class="calendar-status" role="status">Actualizando calendario...</p>}
      @if(error()) {<div class="alert alert-danger" role="alert">{{error()}} <app-button variant="outline-secondary" size="sm" icon="refresh" title="Reintentar" (clicked)="load()" /></div>}
      @defer (when calendarMode) {
        <app-reservation-calendar [data]="agenda()" [date]="day" [view]="calendarView" [zone]="calendarZone" [state]="state" [canCreate]="auth.can('reservas.crear')" [disabled]="loading() || !!error() || saving() || !agenda()?.canchas?.length" (dayChosen)="calendarDay($event)" (selected)="calendarSelect($event)" (eventChosen)="calendarEvent($event)" />
      } @placeholder {<app-loading message="Cargando calendario..." />}
      @if(!loading() && !error() && !agenda()?.canchas?.length) {<p class="calendar-status" role="status">No hay canchas para esta seleccion.</p>}
    } @else if(loading() || error() || !agenda()?.canchas?.length) {
      <app-list-shell [loading]="loading()" [error]="error()" [empty]="!agenda()?.canchas?.length" emptyMessage="No hay canchas para esta seleccion." (retry)="load()" />
    } @else if(agenda();as data) {
      <section class="agenda-section" aria-labelledby="availability-title">
        <header class="agenda-section-heading"><div><h3 id="availability-title">Disponibilidad</h3><span>{{data.canchas.length}} canchas</span></div></header>
        <app-list-shell>
          <app-table class="agenda-table availability-table" label="Disponibilidad de canchas" [fixed]="true" minWidth="0"><thead><tr><th scope="col">Cancha</th><th scope="col">Horario disponible</th></tr></thead><tbody>
            @for(c of data.canchas;track c.id) {
              <tr><td class="court-cell"><div class="court-identity"><span class="material-symbols-outlined" aria-hidden="true">sports_soccer</span><strong>{{c.nombre}}</strong></div></td>
                <td class="slots-cell">
                  @let slots = free(c.id);
                  @if(c.activa && slots.length) {
                    <details [open]="days===1"><summary>{{slots.length}} {{slots.length===1 ? 'horario disponible' : 'horarios disponibles'}}</summary>
                      <div class="agenda-slots">@for(slot of slots;track slot.inicio) {<span class="agenda-slot"><span class="material-symbols-outlined" aria-hidden="true">schedule</span><span>{{slotLabel(slot.inicio)}} - {{slotLabel(slot.fin)}}</span></span>}</div>
                    </details>
                  } @else { <span class="availability-status" [class.off]="!c.activa"><span class="material-symbols-outlined" aria-hidden="true">{{c.activa ? 'schedule' : 'toggle_off'}}</span>{{availabilityStatus(c.id,c.activa)}}</span> }
                </td>
              </tr>
            }
          </tbody></app-table>
        </app-list-shell>
      </section>
      <section class="agenda-section" aria-labelledby="reservations-title">
        <header class="agenda-section-heading"><div><h3 id="reservations-title">Reservas</h3><span>{{reservations.length}} registros</span></div></header>
        <app-list-shell [empty]="!reservations.length" [emptyMessage]="state ? 'No hay reservas con este estado en el periodo.' : 'No hay reservas para el periodo seleccionado.'">
          <app-table class="agenda-table" label="Reservas"><thead><tr><th scope="col">Horario</th><th scope="col">Cancha</th><th scope="col">Cliente</th><th scope="col">Estado</th><th scope="col" class="amount-cell">Total</th><th scope="col" class="action-cell">Acciones</th></tr></thead><tbody>
            @for(r of reservations;track r.id) {
              <tr><td><strong>{{format(r.detalle.inicio)}}</strong><small>Hasta {{format(r.detalle.fin)}}</small><small>{{r.codigo_correlativo || r.codigo}}</small></td><td class="name-cell"><strong>{{r.detalle.cancha_nombre}}</strong><small>{{r.detalle.deporte_nombre}}</small></td><td class="name-cell">{{r.cliente_snapshot.nombre}}</td>
                <td><app-badge [state]="r.estado" /></td><td class="amount-cell">Bs {{r.total}}</td><td class="action-cell"><app-button icon="visibility" title="Ver reserva" variant="outline-secondary" size="sm" (clicked)="detail.set(r)" /></td>
              </tr>
            }
          </tbody></app-table>
        </app-list-shell>
      </section>
      @if(data.bloqueos.length) {
        <section class="agenda-section" aria-labelledby="blocks-title"><header class="agenda-section-heading"><div><h3 id="blocks-title"><span class="material-symbols-outlined" aria-hidden="true">lock</span>Bloqueos operativos</h3><span>{{data.bloqueos.length}} bloqueos</span></div></header>
          <app-list-shell><app-table class="agenda-table" label="Bloqueos operativos"><thead><tr><th scope="col">Cancha</th><th scope="col">Horario</th><th scope="col">Motivo</th>@if(auth.can('bloqueos.liberar')){<th scope="col" class="action-cell">Acciones</th>}</tr></thead><tbody>
            @for(b of data.bloqueos;track b.id) {<tr><td class="name-cell"><strong>{{b.cancha_nombre}}</strong></td><td>{{format(b.inicio)}}<small>Hasta {{format(b.fin)}}</small></td><td class="name-cell">{{b.motivo}}</td>@if(auth.can('bloqueos.liberar')) {<td class="action-cell"><app-button icon="lock" size="sm" variant="outline-secondary" (clicked)="askRelease(b)">Liberar</app-button></td>}</tr>}
          </tbody></app-table></app-list-shell>
        </section>
      }
    }
  </div>
  <app-modal [open]="!!mode() && !clientEditorOpen()" [title]="mode()==='block' ? 'Bloqueo de cancha' : mode()==='move' ? 'Reprogramar reserva pendiente de pago' : 'Nueva reserva'" icon="calendar_month" size="wide" [busy]="saving()" (closed)="closeForm()">
    <form #form="ngForm" (ngSubmit)="form.valid && save()" novalidate><div class="modal-body operation-form">
      <app-form-error [message]="formError()" [active]="!!mode() && !clientEditorOpen()" />
      @if(mode()==='reserve') {
        <app-search-select name="cliente" label="Cliente" placeholder="Buscar cliente" [options]="clientOptions" [(ngModel)]="draft.cliente" [required]="true" (ngModelChange)="invalidateQuote()" />
        @if(auth.can('clientes.crear')) { <div><app-button variant="outline-secondary" icon="person_add" (clicked)="clientEditorOpen.set(true)">Nuevo cliente</app-button></div> }
        <app-search-select name="link" label="Cancha y deporte" placeholder="Buscar cancha" [options]="linkOptions" [(ngModel)]="draft.cancha_deporte" [required]="true" (ngModelChange)="invalidateQuote()" />
        @if(auth.can('reservas.alquilar_inmediato')) { <app-checkbox name="immediate" label="Alquiler inmediato en recepcion" [(ngModel)]="draft.alquiler_inmediato" (ngModelChange)="invalidateQuote()" /> }
      }
      @if(mode()==='block') { <app-search-select name="cancha" label="Cancha" [options]="courtOptions" placeholder="Buscar cancha" [(ngModel)]="draft.cancha" [required]="true" /> }
      @if(!draft.alquiler_inmediato) {
        <app-input name="fecha" type="date" label="Fecha" [(ngModel)]="draft.fecha" [required]="true" (ngModelChange)="invalidateQuote()" />
        <div class="operation-grid"><app-input name="inicio" type="time" label="Hora de inicio" [(ngModel)]="draft.hora_inicio" [required]="true" (ngModelChange)="invalidateQuote()" /><app-input name="fin" type="time" label="Hora de fin" [(ngModel)]="draft.hora_fin" [required]="true" (ngModelChange)="invalidateQuote()" /></div>
        <app-checkbox name="midnight" label="Finaliza al dia siguiente" [(ngModel)]="draft.cruza_medianoche" (ngModelChange)="invalidateQuote()" />
      } @else { <app-input name="duration" type="number" label="Duracion (minutos)" [min]="minimum" [max]="1440" [(ngModel)]="draft.duracion_minutos" [required]="true" (ngModelChange)="invalidateQuote()" /> }
      <app-input name="notas" [label]="mode()==='block' ? 'Motivo del bloqueo' : 'Observaciones'" [(ngModel)]="draft.notas" [required]="mode()==='block'" />
      @if(mode()==='reserve'||mode()==='move') { <app-button variant="outline-primary" icon="payments" [disabled]="form.invalid || quoting()" [loading]="quoting()" (clicked)="calculate()">Cotizar</app-button> }
      @if(quotation();as q) { <section class="quote-summary"><strong>Bs {{q.total}}</strong><p class="mb-2">{{q.minutos}} minutos · Plazo para completar el pago: {{q.retencion_minutos}} minutos</p>@for(part of q.desglose;track $index) { <div>{{part.nombre}} · {{part.minutos}} min · Bs {{part.importe}}</div> }</section> }
    </div><div class="modal-footer"><app-button variant="outline-secondary" (clicked)="closeForm()">Cancelar</app-button><app-button type="submit" icon="save" [loading]="saving()" [disabled]="form.invalid || (mode()!=='block' && !quotation())">{{mode()==='reserve' ? 'Apartar horario' : 'Guardar'}}</app-button></div></form>
  </app-modal>
  <app-cliente-editor [open]="clientEditorOpen()" [branches]="branches" [branch]="branch" [fixedBranch]="true" (closed)="clientEditorOpen.set(false)" (saved)="clientCreated($event)" />
  <app-modal [open]="!!detail()" title="Detalle de reserva" icon="calendar_month" size="wide" (closed)="detail.set(null)">
    @if(detail();as r) { <div class="modal-body operation-form">
      <p class="mb-0"><strong>Reserva {{r.codigo_correlativo || r.codigo}}</strong></p>
      <app-badge [state]="r.estado" />
      <div class="detail-grid"><div><small>Cliente</small><strong>{{r.cliente_snapshot.nombre}}</strong><br>{{r.cliente_snapshot.telefono}}</div><div><small>Cancha / deporte</small>{{r.detalle.cancha_nombre}} / {{r.detalle.deporte_nombre}}</div><div><small>Horario</small>{{format(r.detalle.inicio)}} - {{format(r.detalle.fin)}}</div><div><small>Total / pagado</small>Bs {{r.total}} / Bs {{r.total_pagado}}</div></div>
      @if(pendingPayment(r)) { <div class="alert alert-warning mb-0" role="status">Horario apartado temporalmente. Completa el pago total para confirmar la reserva. Plazo para pagar: {{format(r.retencion_hasta)}}.</div> }
      <p class="mb-0">Saldo pendiente: Bs {{r.saldo_pendiente}}</p>
      <p class="mb-0">Cancelacion: al menos {{r.horas_cancelacion}} horas antes. Sin reembolsos.</p>
      @if(r.condiciones) { <p>{{r.condiciones}}</p> }
      @if(r.notas) { <p>{{r.notas}}</p> }
      <div class="operation-actions">
        @if(r.estado==='PENDIENTE' && auth.can('caja.cobrar') && DateNow()<timestamp(r.retencion_hasta)) {<app-button icon="payments" (clicked)="paymentTarget.set(r);detail.set(null)">Cobrar reserva</app-button>}
        @if(r.estado==='PENDIENTE' && auth.can('reservas.reprogramar')) { <app-button variant="outline-secondary" icon="schedule" (clicked)="openMove(r)">Reprogramar</app-button> }
        @if((r.estado==='PENDIENTE'||r.estado==='CONFIRMADA') && auth.can('reservas.cancelar')) { <app-button variant="outline-danger" icon="cancel" (clicked)="askCancel(r)">Cancelar reserva</app-button> }
        @if(r.estado==='PENDIENTE' && r.total===r.total_pagado && auth.can('reservas.confirmar')) { <app-button icon="check_circle" (clicked)="change(r,'confirmar')">Confirmar</app-button> }
        @if(r.estado==='CONFIRMADA' && DateNow()<timestamp(r.detalle.fin) && auth.can('reservas.iniciar')) { <app-button icon="sports_soccer" (clicked)="change(r,'iniciar')">Iniciar servicio</app-button> }
        @if(r.estado==='CONFIRMADA' && DateNow()>=timestamp(r.detalle.fin) && auth.can('reservas.finalizar')) { <app-button icon="edit" (clicked)="openRegularization(r)">Regularizar reserva</app-button> }
        @if(r.estado==='EN_CURSO' && auth.can('reservas.finalizar')) { <app-button icon="check_circle" (clicked)="change(r,'finalizar')">Finalizar servicio</app-button> }
      </div>
      <h3 class="h6 mb-0">Historial</h3><ul class="history-list">@for(h of r.historial;track $index) { <li>{{actionLabel(h.accion)}}<small>{{format(h.created_at)}} · {{h.actor_nombre || 'Sistema'}}</small>@if(h.accion==='REGULARIZAR'){<small>{{stateLabel(''+h.datos['resultado'])}} · {{h.datos['motivo']}}</small>}</li> }</ul>
    </div> }
  </app-modal>
  <app-modal [open]="!!regularization()" title="Regularizar reserva" icon="edit" [busy]="saving()" (closed)="closeRegularization()">
    <div class="modal-body operation-form">
      <app-form-error [message]="formError()" [active]="!!regularization()" />
      <app-select label="Resultado" [options]="regularizationOptions" [(ngModel)]="regularizationResult" />
      <app-input label="Motivo" [(ngModel)]="regularizationReason" [required]="true" />
    </div>
    <div class="modal-footer"><app-button variant="outline-secondary" (clicked)="closeRegularization()">Volver</app-button><app-button [disabled]="!regularizationResult || !regularizationReason.trim()" [loading]="saving()" (clicked)="saveRegularization()">Guardar</app-button></div>
  </app-modal>
  <app-payment-modal [reservation]="paymentTarget()" (closed)="paymentTarget.set(null)" (paid)="reservationPaid()" />
  <app-modal [open]="!!confirmation()" title="Confirmar operacion" icon="warning" [busy]="saving()" (closed)="confirmation.set(null)">
    <div class="modal-body operation-form">
      <app-form-error [message]="formError()" [active]="!!confirmation()" />
      <p>{{confirmation()?.kind==='cancel' ? 'La reserva sera cancelada. No se realizara ningun reembolso.' : 'La cancha volvera a estar disponible durante este intervalo.'}}</p>
      @if(confirmation()?.kind==='cancel') { <app-input label="Motivo de cancelacion" [(ngModel)]="reason" [required]="true" /> }
    </div><div class="modal-footer"><app-button variant="outline-secondary" (clicked)="confirmation.set(null)">Volver</app-button><app-button variant="danger" [disabled]="confirmation()?.kind==='cancel' && !reason.trim()" [loading]="saving()" (clicked)="confirm()">Confirmar</app-button></div>
  </app-modal>
  <app-modal [open]="!!blockDetail()" title="Bloqueo de cancha" icon="lock" (closed)="blockDetail.set(null)">
    @if(blockDetail();as b){<div class="modal-body operation-form"><strong>{{b.cancha_nombre}}</strong><p>{{format(b.inicio)}} - {{format(b.fin)}}</p><p>{{b.motivo}}</p></div><div class="modal-footer"><app-button variant="outline-secondary" (clicked)="blockDetail.set(null)">Cerrar</app-button>@if(auth.can('bloqueos.liberar')){<app-button variant="outline-danger" icon="lock" (clicked)="blockDetail.set(null);askRelease(b)">Liberar bloqueo</app-button>}</div>}
  </app-modal>
`})
export class AgendaComponent {
  private readonly snackbar=inject(SnackbarService);
  private pendingPaymentNotice?: number;
  readonly pendingPayment = hasPendingPayment;
  readonly actionLabel = reservationActionLabel;
  reservationPaid() {
    if(this.pendingPaymentNotice !== undefined) this.snackbar.dismiss(this.pendingPaymentNotice);
    this.pendingPaymentNotice = undefined;
    this.detail.set(null);
    this.load();
  }
  readonly paymentTarget=signal<Reservation|null>(null);
  readonly DateNow=Date.now;
  readonly timestamp=Date.parse;
  readonly auth=inject(AuthService); private readonly api=inject(ReservasService);
  private readonly route=inject(ActivatedRoute); private readonly router=inject(Router);
  readonly agenda=signal<Agenda|null>(null); readonly loading=signal(false); readonly error=signal(''); readonly message=signal('');
  private readonly availabilityAt=signal(Date.now());
  private readonly availableSlots=computed(() => {
    const data=this.agenda();
    const slots=new Map<number,Span[]>();
    if(!data)return slots;
    // Keep interval keys stable until a new agenda response is received.
    const now=this.availabilityAt();
    for(const court of new Set(data.horarios.map(x=>x.cancha))){
      const occupied=[...data.bloqueos.filter(x=>x.cancha===court),...data.reservas.filter(x=>x.detalle.cancha===court&&(['CONFIRMADA','EN_CURSO','FINALIZADA','NO_ASISTIO'].includes(x.estado)||(x.estado==='PENDIENTE'&&Date.parse(x.retencion_hasta)>now))).map(x=>x.detalle)];
      slots.set(court,freeIntervals(data.horarios.filter(x=>x.cancha===court),occupied,now));
    }
    return slots;
  });
  readonly mode=signal<''|'reserve'|'block'|'move'>(''); readonly saving=signal(false); readonly quoting=signal(false); readonly formError=signal(''); readonly quotation=signal<Quote|null>(null);
  readonly detail=signal<Reservation|null>(null); readonly confirmation=signal<{kind:'cancel'|'release';id:number}|null>(null);
  readonly regularization=signal<number|null>(null);
  readonly regularizationOptions=[{value:'FINALIZADA',label:'Servicio realizado'},{value:'NO_ASISTIO',label:'Cliente no asistio'}];
  regularizationResult=''; regularizationReason='';
  readonly clientEditorOpen = signal(false);
  branches:Branch[]=[]; courts:CourtOption[]=[]; links:CourtLink[]=[]; clients:Cliente[]=[];
  branch=''; court=''; day=localDate(new Date(),'America/La_Paz'); days=1; state=''; reason=''; draft:any={}; moving?:number;
  calendarMode=false; calendarView:CalendarView='day';
  private sequence=0; private quoteSequence=0;
  readonly stateOptions=['PENDIENTE','CONFIRMADA','EN_CURSO','FINALIZADA','NO_ASISTIO','CANCELADA','EXPIRADA'].map(value=>({value,label:this.stateLabel(value)}));
  get branchOptions(){return this.branches.map(x=>({value:String(x.id),label:x.nombre}));}
  get courtOptions(){return this.courts.filter(x=>String(x.sucursal)===this.branch).map(x=>({value:String(x.id),label:x.nombre+(x.activa?'':' (inactiva)')}));}
  get selectedBranchName(){return this.branches.find(x=>String(x.id)===this.branch)?.nombre??'';}
  get linkOptions(){return this.links.filter(x=>String(x.sucursal)===this.branch).map(x=>({value:String(x.id),label:x.nombre}));}
  get clientOptions(){return [{value:'sin-cliente',label:'Sin cliente registrado'},...this.clients.filter(x=>x.activo && x.sucursal===Number(this.branch)).map(x=>({value:String(x.id),label:`${x.nombre} · ${x.telefono}${x.documento ? ' · ' + x.documento : ''}`}))];}
  get minimum(){return this.links.find(x=>x.id===Number(this.draft.cancha_deporte))?.minutos || 60;}
  get reservations(){return (this.agenda()?.reservas || []).filter(x=>!this.state || x.estado===this.state).sort((a,b)=>a.detalle.inicio.localeCompare(b.detalle.inicio));}
  private navigationSubscription?:Subscription;
  private noticeVersion=0;
  ngOnDestroy(){this.navigationSubscription?.unsubscribe();this.noticeVersion++;this.sequence++;}
  constructor(){
    this.api.options().subscribe({next: data=>{
      this.branches=data.sucursales;this.courts=data.canchas;this.links=data.canchas_deportes;
      this.navigationSubscription=this.route.queryParamMap.subscribe(params=>{
        const requestedDay=params.get('fecha');
        if(requestedDay && /^\d{4}-\d{2}-\d{2}$/.test(requestedDay) && !Number.isNaN(Date.parse(requestedDay+'T12:00:00Z')))this.day=requestedDay;
        const selected=this.branches.find(branch=>String(branch.id)===params.get('sucursal'));
        this.branch=String((selected??this.branches.find(b=>String(b.id)===this.branch)??this.branches[0])?.id??'');this.branchChanged();
        const version=++this.noticeVersion, id=Number(params.get('reserva'));
        if(Number.isInteger(id)&&id>0){this.detail.set(null);this.api.reservation(id).subscribe({next:r=>{if(version===this.noticeVersion)this.detail.set(r);},error:e=>{if(version===this.noticeVersion)this.error.set(apiError(e));}});}
        if(params.get('nueva')==='1'){
          if(this.branch && this.auth.can('reservas.crear'))this.openForm('reserve');
          void this.router.navigate([], {relativeTo:this.route,queryParams:{nueva:null},queryParamsHandling:'merge',replaceUrl:true});
        }
      });
    },error:e=>this.error.set(apiError(e))});
  }
  stateLabel(state:string){return ({PENDIENTE:'Pendiente de pago',CONFIRMADA:'Confirmada',EN_CURSO:'En curso',FINALIZADA:'Finalizada',NO_ASISTIO:'Cliente no asistio',CANCELADA:'Cancelada',EXPIRADA:'Plazo de pago vencido'} as Record<string,string>)[state]||state;}
  get periodLabel(){
    if(!this.day)return 'Seleccionar fecha';
    const label=(day:string)=>new Intl.DateTimeFormat('es-BO',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(new Date(day+'T12:00:00Z'));
    if(this.calendarMode && this.calendarView==='month') return new Intl.DateTimeFormat('es-BO',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(this.day+'T12:00:00Z'));
    if(this.calendarMode && this.calendarView==='week') {const range=calendarRange(this.day,'week');return label(range.start)+' - '+label(shiftDay(range.end,-1));}
    return this.days===1?label(this.day):label(this.day)+' - '+label(shiftDay(this.day,6));
  }
  today(){this.day=localDate(new Date(),this.agenda()?.zona_horaria||this.branches.find(x=>String(x.id)===this.branch)?.zona_horaria||'America/La_Paz');this.load();}
  slotLabel(value:string){const zone=this.agenda()?.zona_horaria||'America/La_Paz';return this.days===1&&localDate(new Date(value),zone)===this.day?new Intl.DateTimeFormat('es-BO',{timeZone:zone,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):this.format(value);}
  availabilityStatus(court:number,active:boolean){
    if(!active)return 'Inactiva';
    const windows=this.agenda()?.horarios.filter(x=>x.cancha===court)||[];
    if(!windows.length)return 'Sin horario configurado';
    if(windows.every(x=>Date.parse(x.fin)<=this.availabilityAt()))return 'Jornada finalizada';
    return 'Sin disponibilidad';
  }
  format(value:string){return new Intl.DateTimeFormat('es-BO',{timeZone:this.agenda()?.zona_horaria||'America/La_Paz',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
  branchChanged(){this.court='';this.clients=[];this.agenda.set(null);this.load();}
  move(offset:number){this.day=shiftDay(this.day,offset);this.load();}
  get calendarZone(){return this.branches.find(x=>String(x.id)===this.branch)?.zona_horaria||this.agenda()?.zona_horaria||'America/La_Paz';}
  setPresentation(calendar:boolean){this.calendarMode=calendar;this.message.set('');this.load();}
  setPeriod(view:CalendarView){this.calendarView=view;if(view!=='month')this.days=view==='day'?1:7;this.load();}
  navigatePeriod(direction:number){if(this.calendarMode){this.day=moveCalendarDay(this.day,this.calendarView,direction);this.load();}else this.move(direction*this.days);}
  calendarDay(day:string){this.day=day;this.setPeriod('day');}
  calendarEvent(event:{kind:string;id:number}){
    if(event.kind==='reservation'){const r=this.agenda()?.reservas.find(x=>x.id===event.id);if(r)this.detail.set(r);}
    if(event.kind==='block'){const b=this.agenda()?.bloqueos.find(x=>x.id===event.id);if(b)this.blockDetail.set(b);}
  }
  readonly blockDetail=signal<Block|null>(null);
  calendarSelect(selection:CalendarSelection){
    if(!this.auth.can('reservas.crear')||this.loading()||this.error()||this.saving())return;
    this.message.set('');
    const start=Date.parse(selection.inicio),end=Date.parse(selection.fin);
    const courts=this.agenda()?.canchas.filter(c=>c.activa&&(!this.court||c.id===Number(this.court)))||[];
    const availableCourts=courts.filter(c=>this.free(c.id).some(span=>Date.parse(span.inicio)<=start&&Date.parse(span.fin)>=end));
    const available=availableCourts.length>0;
    if(!available){this.message.set('El intervalo seleccionado no esta disponible. Revisa horarios y bloqueos de la cancha.');return;}
    const links=this.links.filter(x=>availableCourts.some(c=>c.id===x.cancha)&&String(x.sucursal)===this.branch);
    if(!links.some(x=>end-start>=x.minutos*60000)){this.message.set('El intervalo no cumple la duracion minima de alquiler.');return;}
    this.openForm('reserve');Object.assign(this.draft,selection);
    if(this.court && links.length===1)this.draft.cancha_deporte=String(links[0].id);
  }
  load(showLoading=true){
    const sequence=++this.sequence;
    if(!this.branch||!this.day){this.agenda.set(null);this.loading.set(false);this.error.set('');return;}
    if(showLoading)this.loading.set(true);this.error.set('');
    const range=this.calendarMode?calendarRange(this.day,this.calendarView):null;
    this.api.agenda({sucursal:this.branch,fecha:range?.start||this.day,...(range?{hasta:range.end}:{dias:String(this.days)}),...(this.court?{cancha:this.court}:{})}).subscribe({next:data=>{if(sequence===this.sequence){this.availabilityAt.set(Date.now());this.agenda.set(data);this.loading.set(false);const detail=this.detail();if(detail)this.detail.set(data.reservas.find(x=>x.id===detail.id)||detail);}},error:e=>{if(sequence===this.sequence){this.error.set(apiError(e));this.loading.set(false);}}});
  }
  free(court:number){
    return this.availableSlots().get(court)||[];
  }
  openForm(mode:'reserve'|'block'){
    this.formError.set('');this.invalidateQuote();this.draft={fecha:this.day,hora_inicio:'18:00',hora_fin:'19:00',cruza_medianoche:false,alquiler_inmediato:false,duracion_minutos:60,notas:'',cancha:this.court,cancha_deporte:'',cliente:'sin-cliente'};this.mode.set(mode);
    const branch=this.branch;
    if(mode==='reserve' && this.auth.can('clientes.ver'))this.api.clients(branch).subscribe({next:rows=>{if(branch===this.branch && this.mode()==='reserve')this.clients=[...rows,...this.clients.filter(x=>!rows.some(row=>row.id===x.id))];},error:e=>{if(branch===this.branch && this.mode()==='reserve')this.formError.set(apiError(e));}});
  }
  invalidateQuote(){this.quoteSequence++;this.quotation.set(null);this.quoting.set(false);}
  closeForm(){this.mode.set('');this.invalidateQuote();}
  intervalData(){return this.draft.alquiler_inmediato?{alquiler_inmediato:true,duracion_minutos:Number(this.draft.duracion_minutos)}:{fecha:this.draft.fecha,hora_inicio:this.draft.hora_inicio,hora_fin:this.draft.hora_fin,cruza_medianoche:this.draft.cruza_medianoche};}
  bookingData(){return {...this.intervalData(),cancha_deporte:Number(this.draft.cancha_deporte),...(this.draft.cliente==='sin-cliente'?{sin_cliente:true}:{cliente:Number(this.draft.cliente)}),notas:this.draft.notas};}
  clientCreated(client: Cliente){this.clients=[...this.clients.filter(x=>x.id!==client.id),client];this.draft.cliente=String(client.id);this.invalidateQuote();this.clientEditorOpen.set(false);}
  calculate(){const sequence=++this.quoteSequence;this.quoting.set(true);this.formError.set('');const request=this.mode()==='move'?this.api.quoteMove(this.moving!,this.intervalData()):this.api.quote(this.bookingData());request.subscribe({next:q=>{if(sequence===this.quoteSequence){this.quotation.set(q);this.quoting.set(false);}},error:e=>{if(sequence===this.quoteSequence){this.formError.set(apiError(e));this.quoting.set(false);}}});}
  save(){
    if(this.saving() || (this.mode()!=='block'&&!this.quotation()))return;
    this.saving.set(true);this.formError.set('');
    const request: Observable<unknown>=this.mode()==='block'?this.api.block({...this.intervalData(),cancha:Number(this.draft.cancha),motivo:this.draft.notas}):this.mode()==='move'?this.api.change(this.moving!,'reprogramar',{...this.intervalData(),total_esperado:this.quotation()!.total}):this.api.reserve({...this.bookingData(),total_esperado:this.quotation()!.total});
    request.subscribe({next:result=>{
      const mode=this.mode(), reservation=result as Reservation;
      const pending=mode==='reserve' && hasPendingPayment(reservation);
      const collect=pending && this.auth.can('caja.cobrar');
      if(this.pendingPaymentNotice !== undefined)this.snackbar.dismiss(this.pendingPaymentNotice);
      const notice=this.snackbar.success(mode==='block' ? 'Bloqueo de cancha registrado correctamente.' : mode==='move' ? 'Reserva reprogramada correctamente.' : pending ? 'Horario apartado temporalmente. Completa el pago total para confirmar la reserva.' : reservation.estado==='CONFIRMADA' ? 'Reserva confirmada correctamente.' : 'Reserva registrada correctamente.');
      this.pendingPaymentNotice=pending ? notice : undefined;
      this.saving.set(false);this.mode.set('');this.detail.set(null);this.load();if(collect)this.paymentTarget.set(reservation);
    },error:e=>{this.saving.set(false);this.formError.set(apiError(e));if(this.mode()==='reserve'||this.mode()==='move')this.invalidateQuote();}});
  }
  openMove(r:Reservation){this.moving=r.id;this.detail.set(null);this.formError.set('');this.invalidateQuote();const time=(value:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:r.detalle.zona_horaria,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));const date=localDate(new Date(r.detalle.inicio),r.detalle.zona_horaria);this.draft={fecha:date,hora_inicio:time(r.detalle.inicio),hora_fin:time(r.detalle.fin),cruza_medianoche:date!==localDate(new Date(r.detalle.fin),r.detalle.zona_horaria),alquiler_inmediato:false,notas:''};this.mode.set('move');}
  askCancel(r:Reservation){this.detail.set(null);this.reason='';this.formError.set('');this.confirmation.set({kind:'cancel',id:r.id});}
  openRegularization(r:Reservation){this.detail.set(null);this.regularizationResult='';this.regularizationReason='';this.formError.set('');this.regularization.set(r.id);}
  closeRegularization(){if(!this.saving())this.regularization.set(null);}
  saveRegularization(){const id=this.regularization();if(!id||!this.regularizationResult||!this.regularizationReason.trim()||this.saving())return;this.saving.set(true);this.formError.set('');this.api.change(id,'regularizar',{resultado:this.regularizationResult,motivo:this.regularizationReason.trim()}).subscribe({next:()=>{this.saving.set(false);this.regularization.set(null);this.snackbar.success('Reserva regularizada correctamente.');this.load();},error:e=>{this.saving.set(false);this.formError.set(apiError(e));}});}
  askRelease(b:Block){this.formError.set('');this.confirmation.set({kind:'release',id:b.id});}
  confirm(){const action=this.confirmation();if(!action)return;this.saving.set(true);const request:Observable<unknown>=action.kind==='cancel'?this.api.change(action.id,'cancelar',{motivo:this.reason}):this.api.release(action.id);request.subscribe({next:()=>{this.snackbar.success(action.kind==='cancel' ? 'Reserva cancelada correctamente. No se realizan reembolsos.' : 'Bloqueo liberado correctamente.');this.saving.set(false);this.confirmation.set(null);this.load();},error:e=>{this.saving.set(false);this.formError.set(apiError(e));}});}
  change(r:Reservation,action:string){this.message.set('');this.detail.set(null);this.api.change(r.id,action).subscribe({next:()=>{this.snackbar.success(action==='iniciar' ? 'Servicio iniciado correctamente.' : action==='finalizar' ? 'Servicio finalizado correctamente.' : 'Reserva confirmada correctamente.');this.load();},error:e=>this.message.set(apiError(e))});}
}
