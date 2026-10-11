import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CatalogListComponent } from './catalog-list.component';
import { CATALOG, CatalogRow } from './catalog.config';
import { CatalogService } from './catalog.service';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { formatArea, formatDimensions } from './court-dimensions';

@Component({selector:'app-cancha-detail',imports:[CatalogListComponent,ButtonComponent,BadgeComponent,PageHeaderComponent],styleUrls:['./catalog.css','./court-dimensions.css','./cancha-detail.component.css'],
  template:`<div class="main-content">
    <app-page-header [title]="court()?.['nombre'] || 'Informacion de cancha'" icon="sports_soccer" backRoute="/canchas" backLabel="Volver a canchas" />
    @if (error()) {<div class="alert alert-danger" role="alert">{{error()}}</div><app-button icon="refresh" (clicked)="load()">Reintentar</app-button>}
    @if (court(); as c) {
      <header class="court-heading">
        <div class="court-summary">
          <span><span class="material-symbols-outlined" aria-hidden="true">location_on</span>{{c['sucursal_nombre']}}</span>
          <span><span class="material-symbols-outlined" aria-hidden="true">schedule</span>Minimo {{c['duracion_minima_minutos']}} min</span>
          <app-badge title="Publicacion en la web publica" [active]="!!c['publicada']" activeLabel="Publicada" inactiveLabel="No publicada" [icon]="c['publicada'] ? 'public' : 'visibility_off'" />
        </div>
      </header>
      <dl class="court-specifications">
        <div><dt>Tipo de superficie</dt><dd>{{ c['superficie'] || 'Sin registrar' }}</dd></div>
        <div><dt>Dimensiones</dt><dd>{{ dimensions(c['ancho_metros'], c['largo_metros']) }}</dd></div>
        <div><dt>Area de juego</dt><dd>{{ area(c['area_m2']) }}</dd></div>
      </dl>
      @if (auth.can('canchas.editar') && c['pendientes_publicacion']?.length) {
        <div class="alert alert-warning court-publication-alert" role="status">
          <span class="material-symbols-outlined" aria-hidden="true">warning</span>
          <ul>@for (message of c['pendientes_publicacion']; track message) {<li>{{message}}</li>}</ul>
        </div>
      }
      <nav class="catalog-tabs" aria-label="Configuracion de cancha">
        @for (tab of tabs; track tab.key) { @if (auth.can(configs[tab.key].permission + '.ver')) {
          <button type="button" [class.active]="selected() === tab.key" [attr.aria-current]="selected() === tab.key ? 'page' : null" (click)="selected.set(tab.key)">{{tab.label}}</button>
        }}
      </nav>
      @for (tab of tabs; track tab.key) { @if (selected() === tab.key && auth.can(configs[tab.key].permission + '.ver')) {
        <app-catalog-list [config]="configs[tab.key]" [showBack]="false" [fixed]="tab.key === 'politicas' ? branchFilter() : filter" (changed)="load()" />
      }}
    } @else if (!error()) {<p role="status">Cargando cancha...</p>}
  </div>`})
export class CanchaDetailComponent {
  readonly dimensions = formatDimensions;
  readonly area = formatArea;
  private readonly service = inject(CatalogService);
  readonly auth = inject(AuthService);
  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly filter = {cancha:this.id};
  readonly court = signal<CatalogRow | null>(null);
  readonly branchFilter = signal<Record<string,any>>({});
  readonly error = signal('');
  readonly configs = CATALOG;
  readonly selected = signal('cancha-deportes');
  readonly tabs = [{key:'cancha-deportes',label:'Deportes'},{key:'fotos',label:'Fotos'},
    {key:'horarios',label:'Horarios'},{key:'tarifas',label:'Tarifas'},{key:'politicas',label:'Politica de sucursal'}];
  constructor() { this.load(); }
  load() { this.error.set('');this.service.get('canchas',this.id).subscribe({next:c => {
    this.court.set(c); if (this.branchFilter()['sucursal'] !== c['sucursal']) this.branchFilter.set({sucursal:c['sucursal']});
  },error:() => this.error.set('No se pudo cargar la cancha.')}); }
}
