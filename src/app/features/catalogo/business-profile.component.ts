import { Component, input, signal } from '@angular/core';
import type { CatalogRow } from './catalog.config';
import { BadgeComponent } from '../../shared/components/badge/badge.component';

@Component({
  selector: 'app-business-profile',
  imports: [BadgeComponent],
  styleUrl: './business-profile.component.css',
  template: `
    <article class="business-profile">
      <header class="business-identity">
        <div class="business-logo">
          @if (imageAvailable(business()['logo_url'])) {
            <img [src]="webUrl(business()['logo_url'])" alt="Logo del negocio" (error)="imageFailed(business()['logo_url'])" />
          } @else { <span class="material-symbols-outlined" aria-hidden="true">sports_soccer</span> }
        </div>
        <div class="identity-copy">
          <span class="business-eyebrow">Perfil del negocio</span>
          <h2>{{ business()['nombre_comercial'] }}</h2>
          <span class="business-currency"><span class="material-symbols-outlined" aria-hidden="true">payments</span> Bolivianos (Bs)</span>
        </div>
        <app-badge class="publication-status" [active]="!!business()['publicado']" activeLabel="Publicado" inactiveLabel="Borrador" [icon]="business()['publicado'] ? 'public' : 'visibility_off'" />
      </header>

      <div class="business-information">
        <section class="business-section">
          <h3><span class="material-symbols-outlined" aria-hidden="true">storefront</span> Identidad comercial</h3>
          <dl><div><dt>Descripcion publica</dt><dd class="business-description" [class.unset]="!business()['descripcion_publica']">{{ business()['descripcion_publica'] || 'Sin descripcion registrada' }}</dd></div></dl>
        </section>
        <section class="business-section">
          <h3><span class="material-symbols-outlined" aria-hidden="true">contact_phone</span> Contacto</h3>
          <dl class="contact-details">
            <div><dt>Telefono</dt><dd [class.unset]="!business()['telefono']">{{ business()['telefono'] || 'Sin registrar' }}</dd></div>
            <div><dt>Correo publico</dt><dd [class.unset]="!business()['correo_publico']">
              @if (business()['correo_publico']) { <a [href]="'mailto:' + business()['correo_publico']">{{ business()['correo_publico'] }}</a> }
              @else { Sin registrar }
            </dd></div>
            <div class="contact-website"><dt>Sitio web</dt><dd [class.unset]="!business()['sitio_web']">
              @if (webUrl(business()['sitio_web']); as url) { <a [href]="url" target="_blank" rel="noopener noreferrer">{{ business()['sitio_web'] }}<span class="material-symbols-outlined" aria-hidden="true">open_in_new</span></a> }
              @else { {{ business()['sitio_web'] || 'Sin registrar' }} }
            </dd></div>
          </dl>
        </section>
      </div>

      <section class="business-section business-media">
        <h3><span class="material-symbols-outlined" aria-hidden="true">photo_library</span> Imagen del negocio</h3>
        <div class="business-assets">
          @for (asset of assets; track asset.key) {
            <figure>
              <figcaption><strong>{{ asset.label }}</strong><span>{{ asset.subtitle }}</span></figcaption>
              <div class="asset-preview" [class.logo-preview]="asset.key === 'logo_url'">
                @if (imageAvailable(business()[asset.key])) {
                  <img [src]="webUrl(business()[asset.key])" [alt]="asset.label + ' del negocio'" loading="lazy" (error)="imageFailed(business()[asset.key])" />
                } @else {
                  <span class="material-symbols-outlined" aria-hidden="true">{{ asset.key === 'logo_url' ? 'image' : 'panorama' }}</span>
                  <span>{{ business()[asset.key] ? 'Imagen no disponible' : 'Sin imagen registrada' }}</span>
                }
              </div>
              @if (webUrl(business()[asset.key]); as url) { <a class="asset-source" [href]="url" target="_blank" rel="noopener noreferrer" [title]="url">{{ url }}</a> }
            </figure>
          }
        </div>
      </section>
    </article>
  `,
})
export class BusinessProfileComponent {
  readonly business = input.required<CatalogRow>();
  readonly assets = [
    { key: 'logo_url', label: 'Logo', subtitle: 'Identidad visual' },
    { key: 'portada_url', label: 'Portada', subtitle: 'Imagen principal' },
  ];
  private readonly failedImages = signal<string[]>([]);

  webUrl(value: unknown): string {
    const url = typeof value === 'string' ? value.trim() : '';
    return /^https?:\/\//i.test(url) ? url : '';
  }

  imageAvailable(value: unknown): boolean {
    const url = this.webUrl(value);
    return !!url && !this.failedImages().includes(url);
  }

  imageFailed(value: unknown): void {
    const url = this.webUrl(value);
    this.failedImages.update(values => values.includes(url) ? values : [...values, url]);
  }
}
