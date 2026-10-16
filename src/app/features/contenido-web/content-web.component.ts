import { Component, inject, signal, viewChild } from '@angular/core';
import { CatalogListComponent } from '../catalogo/catalog-list.component';
import { CatalogService } from '../catalogo/catalog.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { WEB_CONTENT } from './content.config';
import { apiError } from '../reservas/reservas.service';
import { TabsComponent } from '../../shared/components/tabs/tabs.component';

@Component({selector:'app-content-web',imports:[CatalogListComponent,PageHeaderComponent,ButtonComponent,LoadingComponent,TabsComponent],styleUrl:'./content-web.css',template:`
  <app-page-header title="Contenido web" icon="web" backRoute="/negocio">
    <app-button variant="outline-secondary" icon="open_in_new" (clicked)="openPublic()">Ver web publica</app-button>
  </app-page-header>
  <app-tabs label="Contenido web" [items]="tabs" [selected]="tab()" [disabled]="busy()" (selectedChange)="select($event)">
  @if(tab()!=='publicacion') {<app-catalog-list [config]="configs[tab()]" [showBack]="false" />}
  @else {
    <section class="publication"><h2>Estado de publicacion</h2>
      <app-button icon="refresh" variant="outline-secondary" [loading]="loading()" (clicked)="loadStatus()">Actualizar estado</app-button>
      @if(loading()){<app-loading message="Revisando contenido..." />}
      @else if(error()){<div class="alert alert-danger" role="alert">{{error()}}</div>}
      @else if(status();as s){<p><strong>{{s.slides_publicados}}</strong> slides publicados</p>
        @if(s.pendientes.length){<div class="alert alert-warning" role="status"><ul>@for(p of s.pendientes;track p){<li>{{p}}</li>}</ul></div>}
        @else{<div class="alert alert-success" role="status">Contenido listo para publicar desde Presentacion y ajustes.</div>}
      }
    </section>
  }
  </app-tabs>
`})
export class ContentWebComponent {
  readonly configs=WEB_CONTENT;readonly tab=signal('presentacion');readonly loading=signal(false);readonly error=signal('');
  readonly status=signal<{slides_publicados:number;pendientes:string[]}|null>(null);
  readonly list=viewChild(CatalogListComponent);private readonly api=inject(CatalogService);
  readonly tabs=[{key:'presentacion',label:'Presentacion',icon:'tune'},{key:'slider',label:'Slider',icon:'panorama'},
    {key:'secciones',label:'Secciones',icon:'view_agenda'},{key:'contactos',label:'Contacto',icon:'contact_phone'},
    {key:'redes',label:'Redes sociales',icon:'share'},{key:'publicacion',label:'Publicacion',icon:'public'}];
  busy(){return !!(this.list()?.saving() || this.list()?.movingPhoto());}
  select(key:string){if(this.busy() || key===this.tab() || !this.tabs.some(t=>t.key===key))return;this.tab.set(key);if(key==='publicacion')this.loadStatus();}
  loadStatus(){if(this.loading())return;this.loading.set(true);this.error.set('');this.api.publication().subscribe({
    next:s=>{this.status.set(s);this.loading.set(false);},error:e=>{this.error.set(apiError(e));this.loading.set(false);}});}
  openPublic(){window.open('/', '_blank', 'noopener,noreferrer');}
}
