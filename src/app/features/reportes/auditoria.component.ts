import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RESERVAS_UI } from '../reservas/reservas-ui';
import { apiError } from '../reservas/reservas.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { AuditEvent, Choice, Filters, Page, ReportesService, todayInBolivia, displayDate } from './reportes.service';

@Component({selector:'app-auditoria',imports:[...RESERVAS_UI,PaginationComponent],styleUrl:'./reportes.css',template:`
  <div class="main-content report-workspace">
    <app-page-header title="Auditoria" icon="history" backRoute="/dashboard" />
    <app-list-toolbar label="Filtros de auditoria" searchLabel="Buscar actor, entidad o registro" [(query)]="query" [total]="data()?.count ?? null" [loading]="loading()">
      <app-input toolbar-filter type="date" label="Desde" [(ngModel)]="from" />
      <app-input toolbar-filter type="date" label="Hasta" [(ngModel)]="to" />
      <app-select toolbar-filter label="Sucursal" placeholder="Todas y eventos globales" [options]="branchOptions()" [(ngModel)]="branch" />
      <app-select toolbar-filter label="Entidad" placeholder="Todas" [options]="entities" [(ngModel)]="entity" />
      <app-button icon="search" [loading]="loading()" (clicked)="apply()">Consultar</app-button>
      <app-button icon="refresh" variant="outline-secondary" title="Actualizar auditoria" [disabled]="loading()" (clicked)="load(page())" />
    </app-list-toolbar>
    <app-form-error [message]="error()" />
    <app-list-shell [loading]="loading()" [error]="error()" [empty]="!data()?.results?.length" (retry)="load(page())">
      <app-table label="Eventos de auditoria"><thead><tr><th scope="col">Fecha</th><th scope="col">Actor</th><th scope="col">Sucursal</th><th scope="col">Entidad</th><th scope="col">Registro</th><th scope="col">Accion</th><th scope="col" class="text-center">Detalle</th></tr></thead><tbody>
        @for(row of data()?.results;track row.id){<tr><td>{{date(row.fecha)}}</td><td>{{row.actor}}</td><td>{{row.sucursal}}</td><td>{{row.entidad}}</td><td>{{row.objeto_id}}</td><td><app-badge [label]="row.accion.replaceAll('_',' ')" tone="info" /></td><td class="text-center"><app-button icon="visibility" title="Ver cambios" variant="outline-secondary" size="sm" (clicked)="selected.set(row)" /></td></tr>}
      </tbody></app-table>
    </app-list-shell>
    @if(data();as result){<app-pagination [count]="result.count" [page]="result.page" [pageSize]="size" [busy]="loading()" (pageChanged)="load($event)" (sizeChanged)="changeSize($event)" />}
  </div>
  <app-modal [open]="!!selected()" title="Detalle de auditoria" icon="history" size="wide" (closed)="selected.set(null)">
    @if(selected();as event){<div class="modal-body"><p>{{event.actor}} · {{event.entidad}} #{{event.objeto_id}} · {{date(event.fecha)}}</p><div class="audit-changes"><section><h3>Antes</h3><pre>{{json(event.anterior)}}</pre></section><section><h3>Despues</h3><pre>{{json(event.nuevo)}}</pre></section></div></div>}
  </app-modal>`})
export class AuditoriaComponent {
  private readonly api=inject(ReportesService);private readonly destroyRef=inject(DestroyRef);
  readonly query=signal('');readonly loading=signal(false);readonly error=signal('');readonly data=signal<Page<AuditEvent>|null>(null);
  readonly selected=signal<AuditEvent|null>(null);readonly branches=signal<Choice[]>([]);readonly page=signal(1);
  branch='';entity='';from=todayInBolivia();to=this.from;size=25;private sequence=0;private applied:Filters={};
  readonly date=displayDate;readonly json=(value:unknown)=>JSON.stringify(value,null,2);
  readonly entities=['User','Rol','Permiso','Cancha','TarifaCancha','PoliticaReserva','Caja','SesionCaja','MovimientoCaja','PagoReserva','Reporte'].map(value=>({value,label:value}));
  constructor(){this.apply();}
  branchOptions(){return this.branches().map(b=>({value:String(b.id),label:b.nombre}));}
  apply(){if(!this.from||!this.to||this.from>this.to){this.error.set('Selecciona un periodo valido.');return;}this.applied={desde:this.from,hasta:this.to};for(const [key,value] of Object.entries({sucursal:this.branch,entidad:this.entity,q:this.query().trim()})){if(value)this.applied[key]=value;}this.load(1);}
  load(page=1){const seq=++this.sequence;this.loading.set(true);this.error.set('');this.api.audit({...this.applied,page:String(page),page_size:String(this.size)}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{if(seq!==this.sequence)return;this.data.set(r);this.branches.set(r.sucursales);this.page.set(r.page);this.loading.set(false);},error:e=>{if(seq!==this.sequence)return;this.error.set(apiError(e));this.loading.set(false);}});}
  changeSize(size:number){this.size=size;this.load(1);}
}
