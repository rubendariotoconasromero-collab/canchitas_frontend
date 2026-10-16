import { Component, input, output } from '@angular/core';
import { AvisosComponent } from '../../../../features/reportes/avisos.component';
@Component({
  selector: 'app-topbar',
  imports: [AvisosComponent],
  template: `
        <header class="topbar">
          <div class="topbar-leading">
            <button
              type="button"
              class="icon-button mobile-menu-button"
              title="Abrir menu" aria-label="Abrir menu"
              aria-controls="main-sidebar" [attr.aria-expanded]="menuOpen()"
              (click)="menuRequested.emit()"
            >
              <span class="material-symbols-outlined">menu</span>
            </button>
            <button type="button" class="icon-button desktop-menu-button"
              [title]="compact() ? 'Expandir menu' : 'Contraer menu'"
              [attr.aria-label]="compact() ? 'Expandir menu' : 'Contraer menu'"
              aria-controls="main-sidebar" [attr.aria-expanded]="!compact()"
              (click)="compactRequested.emit()">
              <span class="material-symbols-outlined" aria-hidden="true">{{ compact() ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left' }}</span>
            </button>
            <div>
              <span class="eyebrow">Administracion</span>
              <h1>{{ title() }}</h1>
            </div>
          </div>
          <div class="topbar-user">
            <app-avisos />
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
  readonly compactRequested = output<void>();
  readonly compact = input(false);
  readonly menuOpen = input(false);
}

