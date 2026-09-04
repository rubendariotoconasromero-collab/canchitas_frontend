import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  host: { style: 'display: contents' },
  template: `
      <aside class="sidebar" aria-label="Navegacion principal">
        <div class="brand-block">
          <span class="brand-mark">
            <span class="material-symbols-outlined">sports_soccer</span>
          </span>
          <div class="brand-copy">
            <strong>Canchitas</strong>
            <small>Panel administrativo</small>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section">
            <span class="nav-section-label">Principal</span>
            <a
              class="nav-item"
              routerLink="/dashboard"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              (click)="navigated.emit()"
            >
              <span class="material-symbols-outlined">space_dashboard</span>
              <span>Dashboard</span>
            </a>
          </div>

          <div class="nav-section">
            <span class="nav-section-label">Administracion</span>
            <button
              type="button"
              class="nav-item nav-group-toggle"
              [class.group-active]="accessActive()"
              [attr.aria-expanded]="accessExpanded()"
              aria-controls="access-submenu"
              (click)="accessExpanded.set(!accessExpanded())"
            >
              <span class="material-symbols-outlined" aria-hidden="true">manage_accounts</span>
              <span>Usuarios y accesos</span>
              <span class="material-symbols-outlined nav-chevron" aria-hidden="true">{{ accessExpanded() ? 'expand_less' : 'expand_more' }}</span>
            </button>
            <div id="access-submenu" class="nav-submenu" [hidden]="!accessExpanded()">
            <a class="nav-item" routerLink="/usuarios" routerLinkActive="active" (click)="navigated.emit()">
              <span class="material-symbols-outlined">group</span>
              <span>Usuarios</span>
            </a>
            <a class="nav-item" routerLink="/roles" routerLinkActive="active" (click)="navigated.emit()">
              <span class="material-symbols-outlined">admin_panel_settings</span>
              <span>Roles</span>
            </a>
            <a class="nav-item" routerLink="/permisos" routerLinkActive="active" (click)="navigated.emit()">
              <span class="material-symbols-outlined">key</span>
              <span>Permisos</span>
            </a>
            </div>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user">
            <span class="user-avatar">{{ userName().charAt(0).toUpperCase() }}</span>
            <div class="sidebar-user-copy">
              <strong>{{ userName() }}</strong>
              <small>{{ userEmail() }}</small>
            </div>
          </div>
          <button type="button" class="sidebar-logout" title="Cerrar sesion" (click)="signedOut.emit()">
            <span class="material-symbols-outlined">logout</span>
            <span>Salir</span>
          </button>
        </div>
      </aside>
  `,
})
export class SidebarComponent {
  readonly userName = input('Usuario');
  readonly userEmail = input('');
  readonly navigated = output<void>();
  readonly signedOut = output<void>();
  private readonly router = inject(Router);
  readonly accessActive = signal(this.isAccessRoute(this.router.url));
  readonly accessExpanded = signal(this.isAccessRoute(this.router.url));

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe(event => {
      this.accessActive.set(this.isAccessRoute(event.urlAfterRedirects));
      if (this.accessActive()) this.accessExpanded.set(true);
    });
  }

  private isAccessRoute(url: string): boolean {
    return /^\/(usuarios|roles|permisos)(?:[/?#]|$)/.test(url);
  }
}

