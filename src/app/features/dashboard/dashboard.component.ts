import { Component, inject, signal } from '@angular/core';
import { DashboardService, DashboardSummary } from './dashboard.service';
import { BrandingService } from '../../core/services/branding.service';
import { AuthService } from '../../core/services/auth.service';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';
import { RESERVAS_UI } from '../reservas/reservas-ui';
import { CajaService, Receipt } from '../caja/caja.service';
import { ReceiptComponent } from '../caja/receipt.component';
import { apiError } from '../reservas/reservas.service';

@Component({
  selector: 'app-dashboard',
  imports: [...RESERVAS_UI, MetricCardComponent, ReceiptComponent],
  styleUrl: './dashboard.component.css',
  template: `
    <div class="dashboard-workspace">
      <app-page-header [title]="branding.name()" icon="space_dashboard" [showBack]="false">
        <app-button variant="outline-secondary" icon="refresh" title="Actualizar resumen" [loading]="loading()" (clicked)="load()" />
      </app-page-header>
      <div class="dashboard-context">
        <div><h3>{{ heading }}</h3>@if(data()?.sucursal;as b){<span>{{b.nombre}} · {{day(b.fecha)}}</span>}</div>
        @if(data();as d){<small>Actualizado: {{date(d.actualizado_en)}}</small>}
      </div>
      @if(error()){<div class="alert alert-danger" role="alert">{{error()}}</div>}
      @if(loading()){<div class="dashboard-status"><app-loading message="Cargando resumen..." /></div>}
      @if(data();as d){
        @if(d.sucursales.length>1){<app-list-toolbar label="Sucursal del resumen" [searchEnabled]="false"><app-select toolbar-filter label="Sucursal" [options]="branchOptions" [(ngModel)]="branch" (ngModelChange)="load()" /></app-list-toolbar>}
        <nav class="dashboard-actions" aria-label="Accesos operativos">
          @if(auth.can('caja.ver')){<app-button-link route="/caja" [queryParams]="{sucursal:branch}" icon="payments">Ir a Caja</app-button-link>}
          @if(auth.can('reservas.crear')&&auth.can('reservas.ver')){<app-button-link route="/agenda" [queryParams]="{nueva:'1',sucursal:branch}" icon="add">Nueva reserva</app-button-link>}
          @if(auth.can('reservas.ver')){<app-button-link route="/agenda" [queryParams]="{sucursal:branch}" variant="outline-secondary" icon="calendar_month">Agenda</app-button-link>}
          @if(auth.can('clientes.ver')){<app-button-link route="/clientes" [queryParams]="{sucursal:branch}" variant="outline-secondary" icon="contact_phone">Clientes</app-button-link>}
          @if(auth.can('usuarios.ver')){<app-button-link route="/usuarios" variant="outline-secondary" icon="group">Usuarios</app-button-link>}
          @if(auth.can('reportes.ver')){<app-button-link route="/reportes" [queryParams]="{sucursal:branch}" variant="outline-secondary" icon="space_dashboard">Reportes</app-button-link>}
        </nav>
        @if(!d.sucursal){<p class="dashboard-status">No hay una sucursal activa disponible.</p>}
        @if(d.caja;as c){
          @if(c.administracion;as a){
            <section class="dashboard-section"><h3>Caja de hoy</h3><div class="dashboard-metrics">
              <app-metric-card label="Importe cobrado hoy" [value]="money(a.cobros_hoy.importe)" icon="payments" tone="gold" />
              <app-metric-card label="Cobros registrados" [value]="''+a.cobros_hoy.cantidad" icon="check_circle" tone="blue" />
              <app-metric-card label="Turnos abiertos" [value]="''+a.turnos_abiertos" icon="schedule" tone="green" />
              <app-metric-card label="Cierres con diferencia" [value]="''+a.cierres_con_diferencia" icon="payments" tone="gold" />
            </div><div class="dashboard-media">@for(m of a.cobros_hoy.por_medio;track m.medio){<span>{{m.medio}} <strong>{{money(m.importe)}}</strong></span>}</div></section>
          } @else if(d.perfil==='cajero' || auth.can('reservas.crear')) {
            <section class="dashboard-section"><h3>Mis cobros en turnos abiertos</h3><div class="dashboard-metrics">
              <app-metric-card label="Importe cobrado por mi" [value]="money(c.mis_cobros_turnos_abiertos.importe)" icon="payments" tone="gold" />
              <app-metric-card label="Cantidad de cobros propios" [value]="''+c.mis_cobros_turnos_abiertos.cantidad" icon="check_circle" tone="blue" />
              @for(m of c.mis_cobros_turnos_abiertos.por_medio;track m.medio){<app-metric-card [label]="m.medio" [value]="money(m.importe)" icon="payments" tone="green" />}
            </div></section>
          }
          @if(d.perfil==='administrador'||auth.can('caja.abrir')||auth.can('caja.cerrar')){
            <section class="dashboard-section"><h3>{{d.perfil==='administrador'?'Turnos abiertos':'Mis turnos abiertos'}}</h3>
              @if(!c.cajas_disponibles){<p class="dashboard-status">No hay cajas habilitadas en esta sucursal. El administrador debe crear una caja antes de comenzar a cobrar.</p>}
              @else if(!c.turnos.length){<p class="dashboard-status">No hay un turno abierto {{d.perfil==='administrador'?'en esta sucursal':'a tu nombre'}}.</p>}
              @else{<app-list-shell><app-table label="Turnos abiertos"><thead><tr><th scope="col">Caja</th><th scope="col">Responsable</th><th scope="col">Apertura</th><th scope="col">Monto inicial</th><th scope="col">Efectivo esperado del turno</th></tr></thead><tbody>
                @for(s of c.turnos;track s.id){<tr><td>{{s.caja}}</td><td>{{s.responsable}}</td><td>{{date(s.apertura)}}</td><td>{{money(s.monto_inicial)}}</td><td>{{money(s.efectivo_esperado)}}</td></tr>}
              </tbody></app-table></app-list-shell>}
            </section>
          }
        }
        @if(d.reservas;as r){
          <section class="dashboard-section"><h3>Reservas de hoy</h3><div class="dashboard-metrics">
            <app-metric-card label="Reservas del dia" [value]="''+r.total_dia" icon="calendar_month" tone="blue" />
            <app-metric-card label="Confirmadas" [value]="''+r.por_estado['CONFIRMADA']" icon="check_circle" tone="green" />
            <app-metric-card label="En curso" [value]="''+r.por_estado['EN_CURSO']" icon="sports_soccer" tone="gold" />
            <app-metric-card label="Reservas pendientes de pago del dia" [value]="''+r.por_estado['PENDIENTE']" icon="schedule" tone="gold" />
          </div></section>
          <section class="dashboard-section"><header><h3>Reservas pendientes de pago</h3><span>{{r.pendientes_vigentes}} vigentes</span></header>
            <app-list-shell [empty]="!r.pendientes.length"><app-table label="Reservas pendientes de pago"><thead><tr><th scope="col">Cliente</th><th scope="col">Cancha</th><th scope="col">Horario</th><th scope="col">Plazo para pagar</th><th scope="col">Total</th></tr></thead><tbody>
              @for(p of r.pendientes;track p.id){<tr><td>{{p.cliente}}</td><td>{{p.cancha}}</td><td>{{date(p.inicio)}}</td><td>{{date(p.retencion_hasta)}}</td><td>{{money(p.total)}}</td></tr>}
            </tbody></app-table></app-list-shell>
          </section>
          @if(d.perfil!=='cajero'||auth.can('reservas.crear')){
            <section class="dashboard-section"><h3>Proximas reservas · 7 dias</h3><app-list-shell [empty]="!r.proximas.length"><app-table label="Proximas reservas"><thead><tr><th scope="col">Cliente</th><th scope="col">Cancha</th><th scope="col">Inicio</th><th scope="col">Fin</th><th scope="col">Estado</th></tr></thead><tbody>
              @for(p of r.proximas;track p.id){<tr><td>{{p.cliente}}</td><td>{{p.cancha}}</td><td>{{date(p.inicio)}}</td><td>{{date(p.fin)}}</td><td><app-badge [state]="p.estado" /></td></tr>}
            </tbody></app-table></app-list-shell></section>
          }
        }
        @if(d.caja;as c){
          <section class="dashboard-section"><h3>{{c.administracion?'Ultimos cobros de hoy':'Mis ultimos cobros en turnos abiertos'}}</h3>
            <app-list-shell [empty]="!c.ultimos_cobros.length"><app-table label="Ultimos cobros"><thead><tr><th scope="col">Recibo</th><th scope="col">Cliente</th><th scope="col">Cancha</th><th scope="col">Fecha</th><th scope="col">Medio</th><th scope="col">Importe</th><th scope="col" class="text-center">Acciones</th></tr></thead><tbody>
              @for(p of c.ultimos_cobros;track p.id){<tr><td>{{p.numero}}</td><td>{{p.cliente}}</td><td>{{p.cancha}}</td><td>{{date(p.fecha)}}</td><td>{{p.medio}}</td><td>{{money(p.importe)}}</td><td class="text-center"><app-button variant="outline-secondary" icon="visibility" size="sm" title="Ver recibo" [disabled]="receiptLoading()" (clicked)="showReceipt(p.id)" /></td></tr>}
            </tbody></app-table></app-list-shell>
          </section>
          @if(c.administracion;as a){<section class="dashboard-section"><header><h3>Cierres de hoy</h3><span>Diferencia neta: {{money(a.diferencia_neta)}}</span></header><app-list-shell [empty]="!a.cierres.length"><app-table label="Cierres de hoy"><thead><tr><th scope="col">Caja</th><th scope="col">Responsable</th><th scope="col">Cierre</th><th scope="col">Esperado</th><th scope="col">Contado</th><th scope="col">Diferencia</th></tr></thead><tbody>
            @for(s of a.cierres;track s.id){<tr><td>{{s.caja}}</td><td>{{s.responsable}}</td><td>{{date(s.cierre)}}</td><td>{{money(s.esperado)}}</td><td>{{money(s.contado)}}</td><td>{{money(s.diferencia)}}</td></tr>}
          </tbody></app-table></app-list-shell></section>}
        }
        @if(!d.reservas&&!d.caja&&d.sucursal){<p class="dashboard-status">Sin actividad disponible.</p>}
      }
      <app-modal [open]="!!receipt()" title="Recibo de pago" size="wide" (closed)="receipt.set(null)"><div class="modal-body"><app-cash-receipt [receipt]="receipt()" /></div></app-modal>
    </div>
  `,
})
export class DashboardComponent {
  readonly branding = inject(BrandingService);
  readonly auth = inject(AuthService);
  private readonly api = inject(DashboardService);
  private readonly cash = inject(CajaService);
  readonly data = signal<DashboardSummary|null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly receipt = signal<Receipt|null>(null);
  readonly receiptLoading = signal(false);
  branch = '';
  private sequence = 0;
  private receiptSequence = 0;
  get heading(){return ({administrador:'Resumen del negocio',cajero:'Resumen de caja',recepcion:'Resumen de recepcion',consulta:'Resumen operativo'})[this.data()?.perfil||'consulta'];}
  get branchOptions(){return (this.data()?.sucursales||[]).map(b=>({value:String(b.id),label:b.nombre}));}
  constructor(){this.load();}
  load(){
    const sequence = ++this.sequence;
    this.receiptSequence++; this.receipt.set(null); this.receiptLoading.set(false);
    this.loading.set(true); this.error.set(''); this.data.set(null);
    this.api.summary(this.branch).subscribe({next:d=>{
      if(sequence!==this.sequence)return;
      this.branch=String(d.sucursal?.id||''); this.data.set(d); this.loading.set(false);
      },error:e=>{if(sequence===this.sequence){this.error.set(this.dashboardError(e));this.loading.set(false);}}});
  }
  private dashboardError(error: unknown){
    const status=(error as {status?:number}|null)?.status||0;
    if(status>=500)return 'El servidor no pudo generar el resumen. Verifica que MySQL este activo, aplica las migraciones pendientes con python manage.py migrate y revisa la terminal del backend.';
    return apiError(error);
  }
  money(value:string){return new Intl.NumberFormat('es-BO',{style:'currency',currency:'BOB',currencyDisplay:'narrowSymbol'}).format(Number(value));}
  date(value:string){return new Intl.DateTimeFormat('es-BO',{timeZone:this.data()?.sucursal?.zona_horaria||'America/La_Paz',dateStyle:'short',timeStyle:'short'}).format(new Date(value));}
  day(value:string){return new Intl.DateTimeFormat('es-BO',{timeZone:'UTC',dateStyle:'long'}).format(new Date(value+'T12:00:00Z'));}
  state(value:string){return ({PENDIENTE:'Pendiente de pago',CONFIRMADA:'Confirmada',EN_CURSO:'En curso',FINALIZADA:'Finalizada',NO_ASISTIO:'Cliente no asistio',CANCELADA:'Cancelada',EXPIRADA:'Plazo de pago vencido'} as Record<string,string>)[value]||value;}
  showReceipt(id:number){
    if(this.receiptLoading())return;
    const sequence=++this.receiptSequence;
    this.receiptLoading.set(true);
    this.cash.receipt(id).subscribe({next:r=>{if(sequence===this.receiptSequence){this.receipt.set(r);this.receiptLoading.set(false);}},error:e=>{if(sequence===this.receiptSequence){this.error.set(apiError(e));this.receiptLoading.set(false);}}});
  }
}
