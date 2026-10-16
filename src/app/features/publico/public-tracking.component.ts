import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RESERVAS_UI } from '../reservas/reservas-ui';
import { apiError } from '../reservas/reservas.service';
import { PublicService, Tracking, requestLabels } from './public.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { publicStatus } from './public-request-status';

@Component({selector:'app-public-tracking',imports:RESERVAS_UI,styleUrl:'./public.css',template:`
  <section class="public-width public-page public-tracking">
    <app-page-header [title]="historyMode?'Solicitud de alquiler':'Seguimiento de solicitud'" icon="fact_check" backRoute="/mis-solicitudes">
      @if(historyMode){<app-button variant="outline-secondary" icon="refresh" [loading]="busy()" (clicked)="loadDetail()">Actualizar</app-button>}
    </app-page-header>
    @if(!historyMode){
    <form #form="ngForm" class="public-form" (ngSubmit)="form.valid && consult()" novalidate>
      <app-input label="Codigo de solicitud" name="code" [(ngModel)]="code" [required]="true" [disabled]="busy()" (ngModelChange)="result.set(null)" />
      <app-input label="Clave de seguimiento" name="token" type="password" [showToggle]="true" [(ngModel)]="token" [required]="true" [disabled]="busy()" (ngModelChange)="result.set(null)" />
      <app-button type="submit" icon="refresh" [loading]="busy()" [disabled]="!!form.invalid">Consultar estado</app-button>
    </form>
    }
    <app-form-error [message]="error()" />
    @if(result();as r){<div class="public-tracking-result">
      <p><strong>Solicitud {{r.codigo_correlativo || r.codigo}}</strong></p>
      <app-badge [label]="status(r).label" [tone]="status(r).tone" />
      <h2>{{r.cancha}}</h2><p>{{r.deporte}} · {{date(r.inicio,r.zona_horaria)}} - {{date(r.fin,r.zona_horaria)}}</p>
      <p>Total: <strong>Bs {{r.total}}</strong></p>
      @if(r.horas_cancelacion!==null){<p>Cancelaciones hasta {{r.horas_cancelacion}} horas antes, sin reembolsos.</p>}
      @if(r.condiciones){<p>{{r.condiciones}}</p>}
      @if(r.estado_reserva){<p>Reserva {{r.codigo_reserva}}: <app-badge [state]="r.estado_reserva" /></p>}
      @if(r.estado==='PENDIENTE'){<div class="alert alert-info">La solicitud esta pendiente de revision. Todavia no tienes un horario confirmado.</div>}
      @if(r.estado_reserva==='PENDIENTE' && r.plazo_pago){<div class="alert alert-warning">Solicitud aceptada. Paga el total en el negocio antes de {{date(r.plazo_pago,r.zona_horaria)}} para confirmar la reserva.</div>}
      @if(r.motivo){<p>Motivo: {{r.motivo}}</p>}
      <div class="public-contact-links"><app-button variant="outline-secondary" icon="content_copy" (clicked)="copy()">{{token?'Copiar codigo y clave':'Copiar codigo'}}</app-button>
        @if(!historyMode){<app-button icon="add" [loading]="saving()" (clicked)="saveToHistory()">Agregar a mis solicitudes</app-button>}
      </div>
      @if(!historyMode){<p class="small text-muted">Conserva estos datos en privado. Seguimiento disponible hasta {{date(r.seguimiento_hasta,r.zona_horaria)}}.</p>}
    </div>}
  </section>
`})
export class PublicTrackingComponent {
  private readonly api=inject(PublicService); private readonly route=inject(ActivatedRoute); private readonly snackbar=inject(SnackbarService);
  readonly result=signal<Tracking|null>(null); readonly busy=signal(false); readonly error=signal(''); readonly labels=requestLabels;
  readonly saving=signal(false);readonly status=publicStatus;
  readonly historyMode=!!this.route.snapshot.data?.['publicHistory'];
  code=this.route.snapshot.paramMap.get('codigo') || ''; token=String(history.state?.token || this.api.credential(this.code));
  constructor(){if(this.historyMode)this.loadDetail();else if(this.code && this.token)this.consult();}
  date(value:string,zone:string){return new Intl.DateTimeFormat('es-BO',{timeZone:zone,dateStyle:'short',timeStyle:'short',hour12:false}).format(new Date(value));}
  consult(){if(this.busy()||!this.code.trim()||!this.token.trim())return;this.busy.set(true);this.error.set('');this.result.set(null);
    this.api.track(this.code.trim(),this.token.trim()).subscribe({next:r=>{this.result.set(r);this.code=r.codigo_correlativo || r.codigo || this.code;this.busy.set(false);},error:e=>{this.busy.set(false);this.error.set(apiError(e));}});
  }
  loadDetail(){if(this.busy()||!this.code)return;this.busy.set(true);this.error.set('');this.result.set(null);this.api.historyDetail(this.code).subscribe({
    next:r=>{this.result.set(r);this.code=r.codigo_correlativo || r.codigo;this.busy.set(false);},
    error:e=>{this.busy.set(false);this.error.set(apiError(e));},
  });}
  saveToHistory(){if(this.saving()||!this.result()||!this.token)return;this.saving.set(true);this.error.set('');this.api.importRequest(this.code,this.token).subscribe({
    next:()=>{this.saving.set(false);this.snackbar.success('Solicitud agregada a tu historial.');},
    error:e=>{this.saving.set(false);this.error.set(apiError(e));},
  });}
  copy(){if(!navigator.clipboard){this.error.set('Conserva los datos de tu solicitud.');return;}const text=`Codigo: ${this.code}`+(this.token?`\nClave: ${this.token}`:'');navigator.clipboard.writeText(text).then(()=>this.snackbar.success('Datos de seguimiento copiados.')).catch(()=>this.error.set('No se pudo copiar. Conserva los datos de tu solicitud.'));}
}
