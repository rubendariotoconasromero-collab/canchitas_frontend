import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicSlide } from './public.service';

@Component({selector:'app-public-slider',imports:[RouterLink],changeDetection:ChangeDetectionStrategy.OnPush,styleUrl:'./public-slider.css',template:`
  <section class="hero" role="region" aria-roledescription="carrusel" aria-label="Soccer Real Madrid" tabindex="0" (keydown)="key($event)">
    @if(current();as slide){
      <img class="hero-photo" [src]="slide.imagen" [alt]="slide.alt" fetchpriority="high" />
      <div class="hero-shade"></div>
      <div class="hero-content"><span class="eyebrow">{{lema() || 'Espacios deportivos'}}</span><h1>{{brand()}}</h1>
        <h2>{{slide.titulo}}</h2>@if(slide.descripcion || introduction()){<p>{{slide.descripcion || introduction()}}</p>}
        @if(slide.texto_boton){@if(slide.destino==='SEGUIMIENTO'){<a class="hero-cta" routerLink="/mis-solicitudes">{{slide.texto_boton}}<span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>}
        @else{<a class="hero-cta" [href]="slide.destino==='CONTACTO' ? '#contacto' : '#canchas'">{{slide.texto_boton}}<span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>}}
      </div>
    }@else{<div class="hero-content"><span class="eyebrow">Espacios deportivos</span><h1>{{brand()}}</h1><p>{{introduction()}}</p><a class="hero-cta" href="#canchas">Ver canchas<span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a></div>}
    @if(slides().length>1){<div class="hero-controls">
      <button type="button" (click)="move(-1)" title="Imagen anterior" aria-label="Imagen anterior"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span></button>
      <div class="hero-dots">@for(s of slides();track s.id;let i=$index){<button type="button" [class.selected]="index()===i" [attr.aria-pressed]="index()===i" [attr.aria-label]="'Mostrar imagen '+(i+1)" (click)="select(i)"></button>}</div>
      <button type="button" (click)="move(1)" title="Imagen siguiente" aria-label="Imagen siguiente"><span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></button>
      <span class="hero-count" aria-live="polite">{{index()+1}} / {{slides().length}}</span>
    </div>}
  </section>
`})
export class PublicSliderComponent {
  readonly brand=input('Soccer Real Madrid');readonly lema=input('');readonly introduction=input('');readonly slides=input<PublicSlide[]>([]);
  readonly index=signal(0);readonly current=computed(()=>this.slides()[this.index()] || this.slides()[0]);
  constructor(){effect(()=>{this.slides();this.index.set(0);});}
  select(index:number){if(Number.isInteger(index) && index>=0 && index<this.slides().length)this.index.set(index);}
  move(step:number){const count=this.slides().length;if(count)this.index.set((this.index()+step+count)%count);}
  key(event:KeyboardEvent){if((event.target as HTMLElement)?.tagName!=='SECTION')return;
    if(event.key==='ArrowLeft'){event.preventDefault();this.move(-1);}else if(event.key==='ArrowRight'){event.preventDefault();this.move(1);}
    else if(event.key==='Home'){event.preventDefault();this.select(0);}else if(event.key==='End'){event.preventDefault();this.select(this.slides().length-1);}}
}
