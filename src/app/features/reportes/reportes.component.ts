import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { RESERVAS_UI } from '../reservas/reservas-ui';
import { apiError } from '../reservas/reservas.service';
import { Choice, Filters, ReportesService, ReportOptions, ReportResult, ReportType, todayInBolivia, displayDate } from './reportes.service';
import { REPORT_TABS, REPORT_COLUMNS, SUMMARY_LABELS, MONEY_KEYS } from './reportes.config';
import { TabsComponent } from '../../shared/components/tabs/tabs.component';

@Component({selector:'app-reportes',imports:[...RESERVAS_UI,PaginationComponent,MetricCardComponent,TabsComponent],styleUrl:'./reportes.css',template:`
  <div class="main-content report-workspace">
    <app-page-header title="Reportes" icon="space_dashboard" backRoute="/dashboard">
      @if(auth.can('reportes.exportar')){
        <app-button icon="download" variant="outline-primary" [loading]="exportFormat()==='xlsx'" [disabled]="loading() || exporting() || !data() || !!error()" (clicked)="exportFile('xlsx')">Excel (.xlsx)</app-button>
        <app-button icon="download" variant="outline-secondary" [loading]="exportFormat()==='pdf'" [disabled]="loading() || exporting() || !data() || !!error()" (clicked)="exportFile('pdf')">PDF</app-button>
      }
    </app-page-header>
    @if(!tabs.length){<p>No tienes reportes habilitados.</p>}
    @else{
      <app-tabs label="Tipos de reporte" [items]="tabItems" [selected]="kind()" (selectedChange)="selectType($event)">
      <app-list-toolbar label="Filtros de reportes" searchLabel="Buscar en reporte" [(query)]="query" [loading]="loading()" [total]="data()?.count ?? null">
        <app-select toolbar-filter label="Sucursal" [options]="choices(options()?.sucursales)" [(ngModel)]="branch" [disabled]="optionsLoading()" (ngModelChange)="changeBranch()" />
        <app-input toolbar-filter label="Desde" type="date" [(ngModel)]="from" />
        <app-input toolbar-filter label="Hasta" type="date" [(ngModel)]="to" />
        @if(kind()!=='cierres'){
          <app-select toolbar-filter label="Cancha" placeholder="Todas" [options]="choices(options()?.canchas)" [(ngModel)]="court" />
        }
        @if(kind()!=='cierres'){
          <app-select toolbar-filter label="Deporte" placeholder="Todos" [options]="choices(options()?.deportes)" [(ngModel)]="sport" />
        }
        @if(kind()==='cobros'||kind()==='cierres'){
          <app-select toolbar-filter label="Caja" placeholder="Todas" [options]="choices(options()?.cajas)" [(ngModel)]="box" />
        }
        @if(kind()==='cobros'||kind()==='cierres'){
          <app-select toolbar-filter label="Operador" placeholder="Todos los autorizados" [options]="choices(options()?.operadores)" [(ngModel)]="operator" />
        }
        @if(kind()==='reservas'){<app-select toolbar-filter label="Estado" placeholder="Todos" [options]="states" [(ngModel)]="state" />}
        @if(kind()==='cobros'){<app-select toolbar-filter label="Medio" placeholder="Todos" [options]="choices(options()?.medios)" [(ngModel)]="medium" />}
        <app-button icon="search" [loading]="loading()" [disabled]="optionsLoading()||!branch" (clicked)="apply()">Consultar</app-button>
        <app-button variant="outline-secondary" icon="refresh" title="Actualizar reporte" [disabled]="loading()||!applied()" (clicked)="load(page())" />
      </app-list-toolbar>
      <app-form-error [message]="error()" />
      @if(data();as result){
        <div class="report-context"><span>{{result.meta.sucursal_nombre}} · {{result.meta.desde}} al {{result.meta.hasta}} · {{result.meta.alcance==='propio'?'Mis operaciones':'Sucursal'}}</span><small>Actualizado: {{date(result.meta.generado_en)}}</small></div>
        <p class="report-criterion">{{result.meta.criterio}}</p>
        <div class="report-metrics">@for(metric of metrics();track metric.key){<app-metric-card [label]="metric.label" [value]="metric.value" icon="space_dashboard" tone="gold" />}</div>
        @if(breakdown().length){<div class="report-breakdown">@for(item of breakdown();track item.label){<span>{{item.label}} <strong>{{item.value}}</strong></span>}</div>}
      }
      <app-list-shell [loading]="loading()||optionsLoading()" [error]="error()" [empty]="!data()?.results?.length" (retry)="retry()">
        <app-table [label]="title()" minWidth="960px"><thead><tr>@for(col of columns();track col.key){<th scope="col">{{col.label}}</th>}</tr></thead>
          <tbody>@for(row of data()?.results;track row.id){<tr>@for(col of columns();track col.key){<td>
            @if(col.format==='state'){<app-badge [state]="''+row[col.key]" />}@else if(col.format==='money'){<span class="report-money">{{money(row[col.key])}}</span>}@else if(col.format==='date'){<span class="report-date">{{date(''+row[col.key])}}</span>}@else{ {{row[col.key]}} }
          </td>}</tr>}</tbody></app-table>
      </app-list-shell>
      @if(data();as result){<app-pagination [count]="result.count" [page]="result.page" [pageSize]="size" [busy]="loading()||optionsLoading()" (pageChanged)="load($event)" (sizeChanged)="changeSize($event)" />}
      </app-tabs>
    }
  </div>`})
export class ReportesComponent {
  readonly auth=inject(AuthService);private readonly api=inject(ReportesService);private readonly snackbar=inject(SnackbarService);
  private readonly route=inject(ActivatedRoute);private readonly destroyRef=inject(DestroyRef);
  readonly tabs=REPORT_TABS.filter(t=>this.auth.can('reportes.'+t.id));
  readonly tabItems=this.tabs.map(tab=>({key:tab.id,label:tab.label}));
  readonly kind=signal<ReportType>(this.tabs[0]?.id||'reservas');
  readonly options=signal<ReportOptions|null>(null);readonly data=signal<ReportResult|null>(null);
  readonly loading=signal(false);readonly optionsLoading=signal(false);readonly exporting=signal(false);readonly exportFormat=signal<'xlsx'|'pdf'|''>('');readonly error=signal('');
  readonly applied=signal<Filters|null>(null);readonly query=signal('');readonly page=signal(1);
  branch='';from=todayInBolivia();to=this.from;court='';sport='';state='';box='';medium='';operator='';size=25;
  private sequence=0;private optionsSequence=0;private request?:Subscription;
  readonly columns=computed(()=>REPORT_COLUMNS[this.kind()]);readonly title=computed(()=>REPORT_TABS.find(t=>t.id===this.kind())?.label||'Reportes');
  readonly states=['PENDIENTE','CONFIRMADA','EN_CURSO','FINALIZADA','CANCELADA','EXPIRADA'].map(value=>({value,label:value==='PENDIENTE'?'Pendiente de pago':value.replaceAll('_',' ').toLowerCase()}));
  readonly date=displayDate;
  readonly metrics=computed(()=>Object.entries(this.data()?.resumen||{}).filter(([,value])=>typeof value!=='object').map(([key,value])=>({key,label:SUMMARY_LABELS[key]||key,value:MONEY_KEYS.has(key)?this.money(value):String(value)})));
  readonly breakdown=computed(()=>Object.entries(this.data()?.resumen||{}).filter(([,value])=>typeof value==='object').flatMap(([group,value])=>Object.entries(value as Record<string,string>).map(([key,amount])=>({label:group==='por_estado'?key.replaceAll('_',' ').toLowerCase():key,value:this.money(amount)}))));
  constructor(){this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params=>{
    this.cancel();const selected=this.tabs.find(t=>t.id===params.get('tipo'));if(selected)this.kind.set(selected.id);
    this.branch=params.get('sucursal')||this.branch;this.from=params.get('desde')||this.from;this.to=params.get('hasta')||this.to;
    this.court=this.sport=this.box=this.operator=this.medium=this.state='';this.query.set('');this.data.set(null);this.applied.set(null);
    if(this.tabs.length)this.loadOptions(true);
  });}
  choices(rows:Choice[]|undefined){return (rows||[]).map(r=>({value:String(r.id),label:r.nombre}));}
  money(value:unknown){return 'Bs '+Number(value||0).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2});}
  changeBranch(){this.court=this.sport=this.box=this.operator=this.medium='';this.cancel();this.data.set(null);this.applied.set(null);this.loadOptions(false);}
  private cancel(){this.sequence++;this.request?.unsubscribe();this.loading.set(false);}
  loadOptions(initial=false){const seq=++this.optionsSequence;this.optionsLoading.set(true);this.error.set('');this.api.options(this.branch).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{if(seq!==this.optionsSequence)return;this.options.set(r);this.branch=String(r.sucursal);this.optionsLoading.set(false);if(initial)this.apply();},error:e=>{if(seq!==this.optionsSequence)return;this.error.set(apiError(e));this.optionsLoading.set(false);}});}
  selectType(kind:ReportType){if(kind===this.kind()||!this.tabs.some(t=>t.id===kind))return;this.cancel();this.kind.set(kind);this.data.set(null);this.applied.set(null);this.state='';this.query.set('');this.apply();}
  apply(){if(this.optionsLoading()||!this.branch)return;if(!this.from||!this.to||this.from>this.to){this.error.set('Selecciona un periodo valido.');return;}const p:Filters={sucursal:this.branch,desde:this.from,hasta:this.to};const extra=this.kind()==='reservas'?{cancha:this.court,deporte:this.sport,estado:this.state}:this.kind()==='ocupacion'?{cancha:this.court,deporte:this.sport}:this.kind()==='cobros'?{cancha:this.court,deporte:this.sport,caja:this.box,medio:this.medium,operador:this.operator}:{caja:this.box,operador:this.operator};for(const [key,value] of Object.entries({...extra,q:this.query().trim()})){if(value)p[key]=value;}this.applied.set(p);this.load(1);}
  load(page=1){const filters=this.applied();if(!filters)return;this.cancel();const seq=this.sequence;this.loading.set(true);this.error.set('');this.request=this.api.report(this.kind(),{...filters,page:String(page),page_size:String(this.size)}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{if(seq!==this.sequence)return;this.data.set(r);this.page.set(r.page);this.loading.set(false);},error:e=>{if(seq!==this.sequence)return;this.error.set(apiError(e));this.loading.set(false);}});}
  retry(){if(!this.applied())this.loadOptions(true);else this.load(this.page());}
  changeSize(size:number){this.size=size;this.load(1);}
  exportFile(format:'xlsx'|'pdf'){
    const filters=this.applied();if(!filters||this.exporting()||this.loading()||this.error())return;
    const kind=this.kind();this.exportFormat.set(format);this.exporting.set(true);
    this.api.export(kind,filters,format).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:blob=>{this.exporting.set(false);this.exportFormat.set('');const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=kind+'-'+filters['desde']+'-'+filters['hasta']+'.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.snackbar.success(format==='xlsx'?'Archivo Excel generado correctamente.':'Reporte PDF generado correctamente.');},
      error:async e=>{this.exporting.set(false);this.exportFormat.set('');if(e.error instanceof Blob){try{e.error=JSON.parse(await e.error.text());}catch{/* Preserve non-JSON server errors. */}}this.snackbar.error(apiError(e));},
    });
  }
}
