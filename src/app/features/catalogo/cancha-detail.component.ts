import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogListComponent } from './catalog-list.component';
import { CATALOG, CatalogRow } from './catalog.config';
import { CatalogService } from './catalog.service';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({selector:'app-cancha-detail',imports:[CatalogListComponent,RouterLink,ButtonComponent],styleUrl:'./catalog.css',
  template:`<div class="main-content">
    <a routerLink="/canchas">Volver a canchas</a>
    @if (error()) {<div class="alert alert-danger" role="alert">{{error()}}</div><app-button icon="refresh" (clicked)="load()">Reintentar</app-button>}
    @if (court(); as c) {
      <h2>{{c['nombre']}}</h2><div class="court-summary"><span>{{c['sucursal_nombre']}}</span>
        <span>Minimo {{c['duracion_minima_minutos']}} min</span><strong>{{c['publicada'] ? 'Publicada' : 'Borrador'}}</strong></div>
      @if (c['pendientes_publicacion']?.length) {<ul class="alert alert-warning">@for (message of c['pendientes_publicacion']; track message) {<li>{{message}}</li>}</ul>}
      <nav class="catalog-tabs" aria-label="Configuracion de cancha">
        @for (tab of tabs; track tab.key) { @if (auth.can(configs[tab.key].permission + '.ver')) {
          <button type="button" [class.active]="selected() === tab.key" [attr.aria-current]="selected() === tab.key ? 'page' : null" (click)="selected.set(tab.key)">{{tab.label}}</button>
        }}
      </nav>
      @for (tab of tabs; track tab.key) { @if (selected() === tab.key && auth.can(configs[tab.key].permission + '.ver')) {
        <app-catalog-list [config]="configs[tab.key]" [fixed]="tab.key === 'politicas' ? branchFilter() : filter" (changed)="load()" />
      }}
    } @else if (!error()) {<p role="status">Cargando cancha...</p>}
  </div>`})
export class CanchaDetailComponent {
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
