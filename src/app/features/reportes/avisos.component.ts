import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RESERVAS_UI } from '../reservas/reservas-ui';
import { apiError } from '../reservas/reservas.service';
import { AuthService } from '../../core/services/auth.service';
import { Notices, ReportesService, displayDate } from './reportes.service';

@Component({selector:'app-avisos',imports:RESERVAS_UI,template:`
  @if(auth.can('avisos.ver')){
    <div class="notice-trigger"><app-button variant="outline-secondary" icon="inbox" title="Avisos internos" (clicked)="open.set(true)"><span class="notice-count">{{data()?.count ?? '—'}}</span></app-button></div>
    <app-modal [open]="open()" title="Avisos internos" icon="inbox" size="wide" (closed)="open.set(false)">
      <div class="modal-body">
        <app-list-toolbar label="Resumen de avisos" [searchEnabled]="false" [total]="data()?.count ?? null" entity="avisos" [showRefresh]="true" [loading]="loading()" (refreshed)="load()" />
        @if(data();as result){<p class="notice-updated">Actualizado: {{date(result.actualizado_en)}}</p>@if(result.limitado){<p class="notice-updated">Mostrando hasta 20 avisos por categoria.</p>}}
        <app-list-shell [loading]="loading()" [error]="error()" [empty]="!data()?.results?.length" emptyMessage="Sin avisos pendientes." (retry)="load()">
          <app-table label="Avisos internos" minWidth="480px"><thead><tr><th scope="col">Aviso</th><th scope="col">Fecha</th><th scope="col" class="text-center">Acceso</th></tr></thead><tbody>
            @for(notice of data()?.results;track notice.tipo+'-'+notice.id){<tr><td>{{notice.titulo}} #{{notice.id}}</td><td>{{date(notice.fecha)}}</td><td class="text-center"><app-button-link [route]="notice.ruta" [queryParams]="notice.params" icon="open_in_new" variant="outline-secondary" (click)="open.set(false)">Ver</app-button-link></td></tr>}
          </tbody></app-table>
        </app-list-shell>
      </div>
    </app-modal>
  }`,styles:[`:host{display:block}.notice-trigger{display:flex;align-items:center}.notice-count{min-width:18px;font-size:12px;font-variant-numeric:tabular-nums}.notice-updated{font-size:12px;color:#596b80;margin:12px 0}`]})
export class AvisosComponent {
  readonly auth=inject(AuthService);private readonly api=inject(ReportesService);private readonly destroyRef=inject(DestroyRef);
  readonly open=signal(false);readonly data=signal<Notices|null>(null);readonly loading=signal(false);readonly error=signal('');readonly date=displayDate;
  private sequence=0;
  constructor(){if(this.auth.can('avisos.ver'))this.load();}
  load(){const seq=++this.sequence;this.loading.set(true);this.error.set('');this.api.notices().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{if(seq!==this.sequence)return;this.data.set(r);this.loading.set(false);},error:e=>{if(seq!==this.sequence)return;this.error.set(apiError(e));this.loading.set(false);}});}
}
