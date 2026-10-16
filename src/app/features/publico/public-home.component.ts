import { Component, computed, inject, signal } from '@angular/core';
import { RESERVAS_UI } from '../reservas/reservas-ui';
import { PublicBusiness, PublicCourt, PublicService } from './public.service';
import { apiError } from '../reservas/reservas.service';
import { BrandingService } from '../../core/services/branding.service';
import { PublicSliderComponent } from './public-slider.component';

@Component({selector:'app-public-home',imports:[...RESERVAS_UI,PublicSliderComponent],styleUrls:['./public.css','./public-home.css'],template:`
  @if(business();as b){
    <app-public-slider [brand]="b.nombre" [slides]="heroSlides()" [lema]="b.web?.lema || ''" [introduction]="b.web?.descripcion_intro || b.descripcion" />
    @for(section of b.web?.secciones || [];track section.id){
      <section class="institutional-band" [class.alternate]="section.tipo==='INSTALACIONES'">
        <div class="public-width institutional-content" [class.with-image]="!!section.imagen">
          <div><span class="section-kicker">{{section.tipo}}</span><h2>{{section.titulo}}</h2><p>{{section.contenido}}</p></div>
          @if(section.imagen){<img [src]="section.imagen" [alt]="section.alt" loading="lazy" />}
        </div>
      </section>
    }
    @if(b.web?.mostrar_deportes && b.web?.deportes?.length){<section class="public-width public-section" id="deportes">
      <span class="section-kicker">Elige tu juego</span><h2 class="band-heading">Deportes</h2>
      <div class="sport-grid">@for(d of b.web?.deportes || [];track d.id){<article class="sport-item">
        @if(d.imagen){<img [src]="d.imagen" [alt]="d.alt" loading="lazy" />}
        <div><h3>{{d.nombre}}</h3>@if(d.descripcion){<p>{{d.descripcion}}</p>}
        @if(b.web?.mostrar_canchas!==false){<app-button variant="outline-secondary" icon="arrow_forward" (clicked)="selectSport(d.nombre)">Ver canchas</app-button>}</div>
      </article>}</div>
    </section>}
    @if(b.web?.mostrar_canchas!==false){
    <section class="public-width public-section" id="canchas"><app-page-header title="Nuestras canchas" icon="sports_soccer" [showBack]="false" />
      <app-list-toolbar [query]="query()" (queryChange)="query.set($event)" searchLabel="Buscar cancha" [total]="visible().length" [showRefresh]="true" [loading]="loading()" (refreshed)="loadCourts()">
        <app-select toolbar-filter label="Sucursal" placeholder="Todas" [options]="branches" [ngModel]="branch()" (ngModelChange)="branch.set($event)" />
        <app-select toolbar-filter label="Deporte" placeholder="Todos" [options]="sports" [ngModel]="sport()" (ngModelChange)="sport.set($event)" />
      </app-list-toolbar>
      @if(loading()){<app-loading message="Cargando canchas..." />}
      @else if(error()){<div class="alert alert-warning" role="alert">{{error()}}</div>}
      @else{<div class="public-court-grid">@for(c of visible();track c.id){<article class="public-court-card">
        @if(c.fotos.length){<img [src]="c.fotos[0].url" [alt]="c.fotos[0].descripcion" loading="lazy" />}
        <div class="public-court-body"><small>{{c.sucursal.nombre}}</small><h2>{{c.nombre}}</h2><p>{{c.superficie}} · {{c.minutos_minimos}} min minimo</p><div class="public-sport-tags">@for(d of c.deportes;track d.id){<app-badge [label]="d.nombre" tone="neutral" />}</div>
          <div class="public-court-bottom"><span>@if(c.precio_desde){Desde <strong>Bs {{c.precio_desde}}/hora</strong>}</span><app-button-link [route]="'/espacios/'+c.id" icon="arrow_forward">Ver cancha</app-button-link></div></div>
      </article>}@empty{<p class="public-empty">No hay canchas disponibles para esta seleccion.</p>}</div>}
    </section>
    }
    @if(b.web?.mostrar_contacto!==false){<section class="public-contact" id="contacto"><div class="public-width"><span class="section-kicker">Contacto y ubicacion</span><h2>Encuentranos</h2>
      @if(b.web?.horario_atencion){<p class="attention-hours"><span class="material-symbols-outlined" aria-hidden="true">schedule</span>{{b.web?.horario_atencion}}</p>}
      <div class="public-locations">@for(s of b.sucursales;track s.id){<div><h3>{{s.nombre}}</h3><p>{{s.direccion}}</p>@if(s.telefono){<a [href]="'tel:'+s.telefono">{{s.telefono}}</a>}@if(s.latitud && s.longitud){<a target="_blank" rel="noopener noreferrer" [href]="'https://www.google.com/maps?q='+s.latitud+','+s.longitud">Ver ubicacion</a>}</div>}</div>
      <div class="public-contact-links">@if(b.telefono){<a [href]="'tel:'+b.telefono"><span class="material-symbols-outlined" aria-hidden="true">call</span>{{b.telefono}}</a>}@if(b.correo){<a [href]="'mailto:'+b.correo"><span class="material-symbols-outlined" aria-hidden="true">mail</span>{{b.correo}}</a>}
        @for(c of b.web?.contactos || [];track c.id){<a [href]="contactHref(c.tipo,c.valor)" [attr.target]="c.tipo==='WHATSAPP' ? '_blank' : null" rel="noopener noreferrer"><span class="material-symbols-outlined" aria-hidden="true">{{c.tipo==='CORREO' ? 'mail' : c.tipo==='WHATSAPP' ? 'chat' : 'call'}}</span><span>{{c.etiqueta}}: {{c.valor}}</span></a>}
      </div>
      <div class="social-links">@for(r of b.web?.redes || [];track r.id){<a [href]="r.url" target="_blank" rel="noopener noreferrer">{{r.plataforma}}<span class="material-symbols-outlined" aria-hidden="true">north_east</span></a>}</div>
    </div></section>}
  }@else{<section class="public-width public-section"><h1>{{branding.name()}}</h1>@if(loading()){<app-loading message="Cargando informacion..." />}@else{<p>{{error()}}</p><app-button variant="outline-primary" icon="refresh" (clicked)="load()">Actualizar</app-button>}</section>}
`})
export class PublicHomeComponent {
  private readonly api=inject(PublicService);readonly branding=inject(BrandingService);
  readonly business=signal<PublicBusiness|null>(null);readonly courts=signal<PublicCourt[]>([]);
  readonly loading=signal(false);readonly error=signal('');readonly query=signal('');readonly branch=signal('');readonly sport=signal('');
  readonly visible=computed(()=>this.courts().filter(c=>(!this.branch()||String(c.sucursal.id)===this.branch())&&(!this.sport()||c.deportes.some(d=>d.nombre===this.sport()))&&c.nombre.toLowerCase().includes(this.query().trim().toLowerCase())));
  private sequence=0;
  readonly heroSlides=computed(()=>{
    const b=this.business();if(b?.web?.slides.length)return b.web.slides;
    const photo=this.courts().flatMap(c=>c.fotos)[0];const url=b?.portada || photo?.url;
    return url ? [{id:0,titulo:'Canchas para tu equipo',descripcion:b?.descripcion || '',imagen:url,alt:photo?.descripcion || b?.nombre || '',texto_boton:'Ver canchas',destino:'CANCHAS' as const}] : [];
  });
  selectSport(name:string){this.sport.set(name);document.getElementById('canchas')?.scrollIntoView({behavior:'smooth',block:'start'});}
  contactHref(kind:string,value:string){return kind==='CORREO' ? 'mailto:'+value : kind==='WHATSAPP' ? 'https://wa.me/'+value.replace(/\D/g,'') : 'tel:'+value;}
  get branches(){return this.business()?.sucursales.map(s=>({value:String(s.id),label:s.nombre}))||[];}
  get sports(){return [...new Set(this.courts().flatMap(c=>c.deportes.map(d=>d.nombre)))].map(name=>({value:name,label:name}));}
  constructor(){this.load();}
  load(){const sequence=++this.sequence;this.loading.set(true);this.error.set('');this.api.business().subscribe({next:b=>{if(sequence!==this.sequence)return;this.business.set(b);this.loadCourts();},error:e=>{if(sequence!==this.sequence)return;this.loading.set(false);this.business.set(null);this.error.set(e.status===404?'Pronto compartiremos nuestras canchas y horarios.':apiError(e));}});}
  loadCourts(){const sequence=++this.sequence;this.loading.set(true);this.error.set('');this.api.courts().subscribe({next:c=>{if(sequence!==this.sequence)return;this.courts.set(c);this.loading.set(false);},error:e=>{if(sequence!==this.sequence)return;this.error.set(apiError(e));this.loading.set(false);}});}
}
