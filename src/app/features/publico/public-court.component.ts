import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RESERVAS_UI } from '../reservas/reservas-ui';
import { TextareaComponent } from '../../shared/components/textarea/textarea.component';
import { SnackbarService } from '../../core/services/snackbar.service';
import { apiError, Span } from '../reservas/reservas.service';
import { localDate } from '../reservas/agenda.utils';
import { PublicCourt, PublicQuote, PublicService } from './public.service';

@Component({selector:'app-public-court', imports:[...RESERVAS_UI, TextareaComponent], styleUrl:'./public.css', template:`
  <section class="public-width public-page">
    <app-page-header [title]="court()?.nombre || 'Espacio deportivo'" icon="sports_soccer" backRoute="/" />
    <app-form-error [message]="error()" />
    @if(loading()){<app-loading message="Cargando cancha..." />}
    @if(court(); as c){
      <div class="public-detail-grid">
        <div>
          @if(c.fotos.length){
            <img class="public-gallery-main" [src]="c.fotos[photo].url" [alt]="c.fotos[photo].descripcion || c.nombre" />
            <div class="public-gallery-thumbs">@for(p of c.fotos; track p.url; let i=$index){
              <button type="button" [attr.aria-label]="'Ver foto ' + (i+1)" [attr.aria-pressed]="photo===i" (click)="photo=i"><img [src]="p.url" [alt]="p.descripcion" /></button>
            }</div>
          }
          <p>{{c.descripcion}}</p><p>{{c.sucursal.nombre}} · {{c.sucursal.direccion}}</p>
          <dl class="public-specs"><div><dt>Superficie</dt><dd>{{c.superficie}}</dd></div>
            <div><dt>Dimensiones</dt><dd>{{c.ancho_metros || '-'}} x {{c.largo_metros || '-'}} m</dd></div>
            <div><dt>Capacidad</dt><dd>{{c.capacidad}} personas</dd></div><div><dt>Duracion minima</dt><dd>{{c.minutos_minimos}} minutos</dd></div>
            <div><dt>Techada</dt><dd>{{c.techada ? 'Si' : 'No'}}</dd></div><div><dt>Iluminacion</dt><dd>{{c.iluminacion ? 'Si' : 'No'}}</dd></div>
          </dl>
          <h3>Horario disponible</h3>
          <div class="public-slots">@for(slot of slots(); track slot.inicio){<app-badge [label]="time(slot.inicio) + ' - ' + time(slot.fin)" tone="success" icon="schedule" />}
            @if(!slots().length && !availabilityBusy()){<p>No hay intervalos disponibles para esta fecha.</p>}
          </div>
          <app-button icon="refresh" variant="outline-secondary" [loading]="availabilityBusy()" (clicked)="availability()">Actualizar disponibilidad</app-button>
        </div>
        <div class="public-booking"><h2>Solicitar alquiler</h2>
          <form #form="ngForm" class="public-form" (ngSubmit)="form.valid && submit()" novalidate>
            <app-select label="Deporte" name="sport" [options]="sportOptions" [(ngModel)]="sport" [required]="true" [disabled]="busy()" (ngModelChange)="changed(true)" />
            <app-input label="Fecha" name="day" type="date" [(ngModel)]="day" [required]="true" [disabled]="busy()" (ngModelChange)="changed(true); availability()" />
            <div class="public-field-row"><app-input label="Desde" name="start" type="time" [(ngModel)]="start" [required]="true" [disabled]="busy()" (ngModelChange)="changed(true)" />
              <app-input label="Hasta" name="end" type="time" [(ngModel)]="end" [required]="true" [disabled]="busy()" (ngModelChange)="changed(true)" /></div>
            <app-checkbox label="Finaliza al dia siguiente" name="overnight" [(ngModel)]="overnight" [disabled]="busy()" (ngModelChange)="changed(true)" />
            <app-button icon="calculate" variant="outline-primary" [loading]="quoting()" [disabled]="busy() || !sport || !day || !start || !end" (clicked)="cotizar()">Cotizar</app-button>
            @if(quotation(); as q){<div class="public-price"><span>Total del alquiler</span><strong>Bs {{q.total}}</strong><small>{{q.minutos}} minutos</small></div>
              <p>Pago total para confirmar. Cancelaciones hasta {{q.horas_cancelacion}} horas antes, sin reembolsos.</p>
              @if(q.condiciones){<p>{{q.condiciones}}</p>}
            }
            <app-input label="Nombre completo" name="name" [(ngModel)]="name" [required]="true" [disabled]="busy()" (ngModelChange)="changed()" />
            <app-input label="Telefono" name="phone" type="tel" [(ngModel)]="phone" [required]="true" [disabled]="busy()" (ngModelChange)="changed()" />
            <app-input label="Correo electronico" name="email" type="email" [(ngModel)]="email" [disabled]="busy()" (ngModelChange)="changed()" />
            <app-textarea label="Observaciones" name="notes" [(ngModel)]="notes" [disabled]="busy()" (ngModelChange)="changed()" />
            <app-checkbox label="Acepto las condiciones del servicio" name="consent" [(ngModel)]="consent" [disabled]="busy()" (ngModelChange)="changed()" />
            <div class="alert alert-info">La solicitud requiere revision del operador. El horario no se confirma hasta que sea aceptada y se pague el total.</div>
            <app-button type="submit" icon="send" [fullWidth]="true" [loading]="busy()" [disabled]="form.invalid || !quotation() || !consent || quoting()">Enviar solicitud</app-button>
          </form>
        </div>
      </div>
    }
  </section>
`})
export class PublicCourtComponent {
  private readonly api=inject(PublicService); private readonly route=inject(ActivatedRoute); private readonly router=inject(Router);
  private readonly snackbar=inject(SnackbarService);
  readonly court=signal<PublicCourt|null>(null); readonly quotation=signal<PublicQuote|null>(null);
  readonly slots=signal<Span[]>([]); readonly loading=signal(true); readonly busy=signal(false); readonly quoting=signal(false);
  readonly availabilityBusy=signal(false); readonly error=signal('');
  photo=0; sport=''; day=''; start=''; end=''; overnight=false; name=''; phone=''; email=''; notes=''; consent=false;
  private key=crypto.randomUUID(); private quoteVersion=0; private availabilityVersion=0;
  constructor(){const id=Number(this.route.snapshot.paramMap.get('id'));
    if(!Number.isInteger(id)||id<1){this.loading.set(false);this.error.set('Cancha no disponible.');return;}
    this.api.court(id).subscribe({next:c=>{this.court.set(c);this.day=localDate(new Date(),c.sucursal.zona_horaria);const requested=this.route.snapshot.queryParamMap?.get('deporte');this.sport=String(c.deportes.find(d=>String(d.id)===requested)?.id || c.deportes[0]?.id || '');this.loading.set(false);this.availability();},error:e=>{this.loading.set(false);this.error.set(apiError(e));}});
  }
  get sportOptions(){return (this.court()?.deportes || []).map(d=>({value:String(d.id),label:d.nombre}));}
  time(value:string){return new Intl.DateTimeFormat('es-BO',{timeZone:this.court()?.sucursal.zona_horaria || 'America/La_Paz',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
  changed(interval=false){this.key=crypto.randomUUID();if(interval){this.quoteVersion++;this.quotation.set(null);this.consent=false;this.quoting.set(false);}}
  private interval(){return {cancha_deporte:Number(this.sport),fecha:this.day,hora_inicio:this.start,hora_fin:this.end,cruza_medianoche:this.overnight};}
  availability(){const c=this.court();const version=++this.availabilityVersion;this.slots.set([]);this.availabilityBusy.set(false);this.error.set('');if(!c||!this.day)return;
    this.availabilityBusy.set(true);this.api.availability(c.id,this.day).subscribe({next:r=>{if(version!==this.availabilityVersion)return;this.slots.set(r.intervalos);this.availabilityBusy.set(false);},error:e=>{if(version!==this.availabilityVersion)return;this.availabilityBusy.set(false);this.error.set(apiError(e));}});
  }
  cotizar(){if(this.busy()||this.quoting()||!this.sport||!this.day||!this.start||!this.end)return;
    const version=++this.quoteVersion;this.key=crypto.randomUUID();this.quotation.set(null);this.consent=false;this.quoting.set(true);this.error.set('');
    this.api.quote(this.interval()).subscribe({next:q=>{if(version!==this.quoteVersion)return;this.quotation.set(q);this.quoting.set(false);},error:e=>{if(version!==this.quoteVersion)return;this.quoting.set(false);this.error.set(apiError(e));}});
  }
  submit(){const quote=this.quotation();if(!quote||this.busy()||this.quoting()||!this.consent||!this.name.trim()||!/^(?=(?:\D*\d){7})\+?[0-9 ()-]{7,40}$/.test(this.phone)){this.error.set('Completa tus datos, revisa el telefono y acepta las condiciones.');return;}
    this.busy.set(true);this.error.set('');
    this.api.submit({...this.interval(),nombre:this.name.trim(),telefono:this.phone.trim(),correo:this.email.trim(),notas:this.notes.trim(),condiciones_aceptadas:true,total_esperado:quote.total,condiciones_esperadas:quote.condiciones,horas_cancelacion_esperadas:quote.horas_cancelacion,clave:this.key}).subscribe({next:r=>{
      this.api.remember(r);this.busy.set(false);this.snackbar.success('Solicitud enviada. Conserva el codigo y la clave de seguimiento.');
      this.router.navigate(['/mis-solicitudes',r.codigo_correlativo || r.codigo],{state:{token:r.token}});
    },error:e=>{this.busy.set(false);if(e.status===409){this.quotation.set(null);this.consent=false;}this.error.set(apiError(e));}});
  }
}
