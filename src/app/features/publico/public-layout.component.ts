import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BrandingService } from '../../core/services/branding.service';
import { PublicBusiness, PublicService } from './public.service';

@Component({selector:'app-public-layout',imports:[RouterLink,RouterLinkActive,RouterOutlet],styleUrl:'./public-layout.css',template:`
  <div class="public-site">
    <header class="public-nav" (keydown.escape)="closeMenu(menuToggle)"><div class="public-width public-nav-inner">
      <a class="public-brand" routerLink="/" (click)="closeMenu()"><img [src]="business()?.logo || 'escudo-real-madrid.png'" alt="" width="50" height="58" /><span><strong>{{business()?.nombre || branding.name()}}</strong><small>Alquiler de canchas</small></span></a>
      <button #menuToggle class="public-menu-toggle" type="button" aria-controls="public-navigation" [attr.aria-expanded]="menuOpen()" [attr.aria-label]="menuOpen() ? 'Cerrar menu' : 'Abrir menu'" [title]="menuOpen() ? 'Cerrar menu' : 'Abrir menu'" (click)="menuOpen.set(!menuOpen())"><span class="material-symbols-outlined" aria-hidden="true">{{menuOpen() ? 'close' : 'menu'}}</span></button>
      <nav id="public-navigation" class="public-nav-links" [class.is-open]="menuOpen()" aria-label="Navegacion publica">
        <a routerLink="/" routerLinkActive="selected" [routerLinkActiveOptions]="{exact:true}" (click)="closeMenu()">Inicio</a>
        @if(business() && business()?.web?.mostrar_canchas!==false){<a routerLink="/" fragment="canchas" (click)="goToSection('canchas')">Canchas</a>}
        @if(business()?.web?.mostrar_deportes && business()?.web?.deportes?.length){<a routerLink="/" fragment="deportes" (click)="goToSection('deportes')">Deportes</a>}
        <a routerLink="/mis-solicitudes" routerLinkActive="selected" (click)="closeMenu()">Mis solicitudes</a>
        @if(business() && business()?.web?.mostrar_contacto!==false){<a routerLink="/" fragment="contacto" (click)="goToSection('contacto')">Contacto</a>}
        <a class="staff-link" routerLink="/login" (click)="closeMenu()"><span class="material-symbols-outlined" aria-hidden="true">lock</span><span>Personal</span></a>
      </nav>
    </div></header>
    <main><router-outlet /></main>
    <footer class="public-footer"><div class="public-width"><strong>{{business()?.nombre || branding.name()}}</strong><span>Espacios deportivos · Bolivianos (Bs)</span>
      <nav aria-label="Redes sociales">@for(r of business()?.web?.redes || [];track r.id){<a [href]="r.url" target="_blank" rel="noopener noreferrer">{{r.plataforma}}</a>}</nav>
    </div></footer>
  </div>
`})
export class PublicLayoutComponent {
  readonly branding=inject(BrandingService);readonly business=signal<PublicBusiness|null>(null);
  readonly menuOpen=signal(false);
  closeMenu(button?:HTMLButtonElement){if(this.menuOpen()){this.menuOpen.set(false);button?.focus();}}
  goToSection(id:string){this.closeMenu();document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});}
  constructor(){const title=inject(Title),meta=inject(Meta),previousTitle=title.getTitle(),previousDescription=meta.getTag('name="description"')?.content;
    const request=inject(PublicService).business().subscribe({next:b=>{this.business.set(b);title.setTitle(b.web?.seo_titulo || b.nombre);meta.updateTag({name:'description',content:b.web?.seo_descripcion || b.descripcion});},error:()=>{}});
    inject(DestroyRef).onDestroy(()=>{request.unsubscribe();title.setTitle(previousTitle);if(previousDescription!==undefined)meta.updateTag({name:'description',content:previousDescription});else meta.removeTag('name="description"');});
  }
}
