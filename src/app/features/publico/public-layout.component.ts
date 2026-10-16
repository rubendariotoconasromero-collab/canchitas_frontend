import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BrandingService } from '../../core/services/branding.service';
import { PublicBusiness, PublicService } from './public.service';

@Component({selector:'app-public-layout',imports:[RouterLink,RouterLinkActive,RouterOutlet],styleUrl:'./public-layout.css',template:`
  <div class="public-site">
    <header class="public-nav"><div class="public-width public-nav-inner">
      <a class="public-brand" routerLink="/"><img [src]="business()?.logo || 'escudo-real-madrid.png'" alt="" width="42" height="52" /><strong>{{business()?.nombre || branding.name()}}</strong></a>
      <nav aria-label="Navegacion publica"><a routerLink="/" routerLinkActive="selected" [routerLinkActiveOptions]="{exact:true}">Canchas</a><a routerLink="/mis-solicitudes" routerLinkActive="selected">Mis solicitudes</a><a class="staff-link" routerLink="/login"><span class="material-symbols-outlined" aria-hidden="true">lock</span><span>Personal</span></a></nav>
    </div></header>
    <main><router-outlet /></main>
    <footer class="public-footer"><div class="public-width"><strong>{{business()?.nombre || branding.name()}}</strong><span>Espacios deportivos · Bolivianos (Bs)</span>
      <nav aria-label="Redes sociales">@for(r of business()?.web?.redes || [];track r.id){<a [href]="r.url" target="_blank" rel="noopener noreferrer">{{r.plataforma}}</a>}</nav>
    </div></footer>
  </div>
`})
export class PublicLayoutComponent {
  readonly branding=inject(BrandingService);readonly business=signal<PublicBusiness|null>(null);
  constructor(){const title=inject(Title),meta=inject(Meta),previousTitle=title.getTitle(),previousDescription=meta.getTag('name="description"')?.content;
    const request=inject(PublicService).business().subscribe({next:b=>{this.business.set(b);title.setTitle(b.web?.seo_titulo || b.nombre);meta.updateTag({name:'description',content:b.web?.seo_descripcion || b.descripcion});},error:()=>{}});
    inject(DestroyRef).onDestroy(()=>{request.unsubscribe();title.setTitle(previousTitle);if(previousDescription!==undefined)meta.updateTag({name:'description',content:previousDescription});else meta.removeTag('name="description"');});
  }
}
