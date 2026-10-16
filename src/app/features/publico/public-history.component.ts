import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { RESERVAS_UI } from '../reservas/reservas-ui';
import { apiError } from '../reservas/reservas.service';
import { localDate } from '../reservas/agenda.utils';
import { SnackbarService } from '../../core/services/snackbar.service';
import { TabsComponent } from '../../shared/components/tabs/tabs.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { DropdownComponent, DropdownItemComponent } from '../../shared/components/dropdown';
import { PublicHistoryRow, PublicHistoryResult, PublicService } from './public.service';
import { publicStatus, publicStatusLabels } from './public-request-status';

@Component({selector:'app-public-history',imports:[...RESERVAS_UI,TabsComponent,PaginationComponent,DropdownComponent,DropdownItemComponent],styleUrl:'./public.css',template:`
  <section class="public-width public-page public-history">
    <app-page-header title="Solicitudes de alquiler" icon="fact_check" backRoute="/">
      <app-button variant="outline-secondary" icon="add" (clicked)="openImport()">Consultar otra solicitud</app-button>
      <app-button-link route="/" icon="sports_soccer">Solicitar alquiler</app-button-link>
    </app-page-header>
    <app-tabs label="Mis solicitudes" [items]="tabs" [selected]="group" (selectedChange)="selectGroup($event)">
      <app-list-toolbar label="Filtros de solicitudes" searchLabel="Buscar solicitud" searchPlaceholder="Codigo, cancha o deporte" [(query)]="query" [total]="data()?.count ?? null" entity="solicitudes" [loading]="loading()" [showRefresh]="true" (refreshed)="load(page)">
        <app-select toolbar-filter label="Estado" placeholder="Todos" [options]="states" [(ngModel)]="state" />
        <app-input toolbar-filter label="Fecha desde" type="date" [(ngModel)]="from" />
        <app-input toolbar-filter label="Fecha hasta" type="date" [(ngModel)]="to" />
        <app-select toolbar-filter label="Orden" [options]="orders" [(ngModel)]="order" />
        <app-button icon="search" [disabled]="loading()||busy()" (clicked)="apply()">Buscar</app-button>
      </app-list-toolbar>
      <app-form-error [message]="error()" />
      <app-list-shell [loading]="loading()" [error]="loadError()" [empty]="!data()?.results?.length" emptyMessage="No hay solicitudes en este historial para los filtros seleccionados." (retry)="load(page)">
        <app-table label="Mis solicitudes de alquiler" minWidth="900px">
          <thead><tr><th scope="col">Solicitud</th><th scope="col">Cancha / deporte</th><th scope="col">Fecha y horario</th><th scope="col">Importe</th><th scope="col">Estado</th><th scope="col" class="text-center">Acciones</th></tr></thead>
          <tbody>@for(row of data()?.results;track row.codigo){<tr>
            <td><strong>{{row.codigo_correlativo || row.codigo}}</strong><small class="public-history-secondary">{{date(row.creado_at,row.zona_horaria)}}</small></td>
            <td>{{row.cancha}}<small class="public-history-secondary">{{row.deporte}} · {{row.sucursal}}</small></td>
            <td>{{date(row.inicio,row.zona_horaria)}}<small class="public-history-secondary">Hasta {{date(row.fin,row.zona_horaria)}}</small></td>
            <td class="public-history-money">{{money(row.total)}}</td>
            <td><app-badge [label]="status(row).label" [tone]="status(row).tone" /></td>
            <td class="text-center"><app-dropdown align="end" [title]="'Acciones para '+(row.codigo_correlativo || row.codigo)">
              <app-dropdown-item icon="visibility" label="Ver detalle" (clicked)="view(row)" />
              <app-dropdown-item icon="sports_soccer" label="Volver a solicitar" [disabled]="!row.cancha_disponible" (clicked)="repeat(row)" />
              <app-dropdown-item icon="close" label="Quitar de este historial" [danger]="true" [disabled]="busy()" (clicked)="askRemove(row)" />
            </app-dropdown></td>
          </tr>}</tbody>
        </app-table>
      </app-list-shell>
      @if(data();as result){<app-pagination [count]="result.count" [page]="page" [pageSize]="size" [busy]="loading()||busy()" (pageChanged)="load($event)" (sizeChanged)="changeSize($event)" />}
    </app-tabs>
    <div class="public-history-footer"><span>Historial privado de este navegador.</span><app-button variant="outline-secondary" icon="logout" [disabled]="busy()||loading()" (clicked)="askClear()">Desvincular historial del dispositivo</app-button></div>
  </section>
  <app-modal [open]="importing()" title="Consultar otra solicitud" icon="fact_check" [busy]="busy()" (closed)="closeImport()">
    <form #form="ngForm" (ngSubmit)="form.valid && add()" novalidate><div class="modal-body public-form">
      <app-form-error [message]="formError()" [active]="importing()" />
      <app-input label="Codigo de solicitud" name="code" [(ngModel)]="code" [required]="true" [disabled]="busy()" />
      <app-input label="Clave de seguimiento" name="token" type="password" [showToggle]="true" [(ngModel)]="token" [required]="true" [disabled]="busy()" />
    </div><div class="modal-footer"><app-button variant="outline-secondary" [disabled]="busy()" (clicked)="closeImport()">Cancelar</app-button><app-button type="submit" icon="add" [loading]="busy()" [disabled]="!!form.invalid">Agregar a mis solicitudes</app-button></div></form>
  </app-modal>
  <app-modal [open]="!!removal()" [title]="removal()?.all?'Desvincular historial':'Quitar solicitud del historial'" icon="help" [busy]="busy()" (closed)="closeRemoval()">
    <div class="modal-body"><p>{{removal()?.all?'Se desvincularan todas las solicitudes de este navegador.':'Esta solicitud dejara de aparecer en el historial de este navegador.'}} Las solicitudes y reservas del negocio no se eliminaran ni cancelaran.</p><app-form-error [message]="formError()" [active]="!!removal()" /></div>
    <div class="modal-footer"><app-button variant="outline-secondary" [disabled]="busy()" (clicked)="closeRemoval()">Cancelar</app-button><app-button variant="danger" icon="close" [loading]="busy()" (clicked)="remove()">Confirmar</app-button></div>
  </app-modal>
`})
export class PublicHistoryComponent {
  private readonly api=inject(PublicService);private readonly router=inject(Router);
  private readonly snackbar=inject(SnackbarService);private readonly destroyRef=inject(DestroyRef);
  readonly data=signal<PublicHistoryResult|null>(null);readonly loading=signal(false);readonly busy=signal(false);
  readonly error=signal('');readonly loadError=signal('');readonly formError=signal('');readonly importing=signal(false);
  readonly removal=signal<{all:boolean;code?:string}|null>(null);
  readonly tabs=[{key:'todas',label:'Todas'},{key:'pendientes',label:'Pendientes'},{key:'confirmadas',label:'Confirmadas'},{key:'historial',label:'Historial'}];
  readonly states=Object.entries(publicStatusLabels).filter(([value])=>value!=='ACEPTADA').map(([value,label])=>({value,label}));
  readonly orders=[{value:'recientes',label:'Mas recientes'},{value:'anteriores',label:'Mas antiguas'}];
  group='todas';query='';state='';from=localDate(new Date(),'America/La_Paz');to=this.from;order='recientes';page=1;size=25;code='';token='';
  private applied:Record<string,string>={grupo:'todas',orden:'recientes'};private sequence=0;private request?:Subscription;
  readonly status=publicStatus;
  constructor(){this.apply();}
  date(value:string,zone:string){return new Intl.DateTimeFormat('es-BO',{timeZone:zone,dateStyle:'short',timeStyle:'short',hour12:false}).format(new Date(value));}
  money(value:string){return 'Bs '+Number(value).toLocaleString('es-BO',{minimumFractionDigits:2,maximumFractionDigits:2});}
  apply(){
    if(this.busy())return;
    if(this.from&&this.to&&this.from>this.to){this.error.set('Selecciona un periodo de fechas valido.');return;}
    this.applied={grupo:this.group,orden:this.order};
    for(const [key,value] of Object.entries({q:this.query.trim(),estado:this.state,desde:this.from,hasta:this.to}))if(value)this.applied[key]=value;
    this.load(1);
  }
  selectGroup(group:string){if(this.busy()||group===this.group||!this.tabs.some(t=>t.key===group))return;this.group=group;this.state='';this.apply();}
  load(page=1){
    if(this.busy())return;
    const seq=++this.sequence;this.request?.unsubscribe();this.loading.set(true);this.loadError.set('');this.error.set('');this.data.set(null);
    this.request=this.api.requestHistory({...this.applied,page:String(page),page_size:String(this.size)}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:r=>{if(seq!==this.sequence)return;this.data.set(r);this.page=r.page;this.loading.set(false);},
      error:e=>{if(seq!==this.sequence)return;this.loadError.set(apiError(e));this.loading.set(false);},
    });
  }
  changeSize(size:number){if(![25,50,100].includes(size)||this.busy())return;this.size=size;this.load(1);}
  view(row:PublicHistoryRow){this.router.navigate(['/mis-solicitudes',row.codigo_correlativo || row.codigo]);}
  repeat(row:PublicHistoryRow){if(row.cancha_disponible)this.router.navigate(['/espacios',row.cancha_id],{queryParams:{deporte:String(row.cancha_deporte_id)}});}
  openImport(){if(this.busy())return;this.code='';this.token='';this.formError.set('');this.importing.set(true);}
  closeImport(){if(!this.busy())this.importing.set(false);}
  add(){
    if(this.busy()||!this.code.trim()||!this.token.trim())return;this.busy.set(true);this.formError.set('');
    this.api.importRequest(this.code.trim(),this.token.trim()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:()=>{this.busy.set(false);this.importing.set(false);this.token='';this.snackbar.success('Solicitud agregada a tu historial.');this.group='todas';this.state=this.query=this.from=this.to='';this.apply();},
      error:e=>{this.busy.set(false);this.formError.set(apiError(e));},
    });
  }
  askRemove(row:PublicHistoryRow){if(this.busy())return;this.formError.set('');this.removal.set({all:false,code:row.codigo_correlativo || row.codigo});}
  askClear(){if(this.busy())return;this.formError.set('');this.removal.set({all:true});}
  closeRemoval(){if(!this.busy())this.removal.set(null);}
  remove(){
    const target=this.removal();if(!target||this.busy())return;this.busy.set(true);this.formError.set('');
    const request=target.all?this.api.clearHistory():this.api.removeFromHistory(target.code!);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:()=>{this.busy.set(false);this.removal.set(null);this.snackbar.success(target.all?'Historial desvinculado de este dispositivo.':'Solicitud quitada de este historial.');this.load(this.page);},
      error:e=>{this.busy.set(false);this.formError.set(apiError(e));},
    });
  }
}
