import { Component, input, output } from '@angular/core';
@Component({
  selector: 'app-topbar',
  template: `
        <header class="topbar">
          <div class="topbar-leading">
            <button
              type="button"
              class="icon-button mobile-menu-button"
              title="Abrir menu" aria-label="Abrir menu"
              (click)="menuRequested.emit()"
            >
              <span class="material-symbols-outlined">menu</span>
            </button>
            <div>
              <span class="eyebrow">Administracion</span>
              <h1>{{ title() }}</h1>
            </div>
          </div>
          <div class="topbar-user">
            <span class="topbar-avatar">{{ userName().charAt(0).toUpperCase() }}</span>
            <div>
              <strong>{{ userName() }}</strong>
              <small>Sesion activa</small>
            </div>
          </div>
        </header>
  `,
})
export class TopbarComponent {
  readonly title = input.required<string>();
  readonly userName = input('Usuario');
  readonly menuRequested = output<void>();
}

