import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CanDirective } from '../../../directives/can.directive';
import { AuthService } from '../../../../core/services/auth.service';
import { BrandingService } from '../../../../core/services/branding.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, CanDirective],
  host: { style: 'display: contents' },
  template: `
      <aside class="sidebar" aria-label="Navegacion principal">
        <div class="brand-block">
          <span class="brand-mark" aria-hidden="true">
            <img src="escudo-real-madrid.png" alt="Escudo Real Madrid" width="42" height="52" />
          </span>
          <div class="brand-copy">
            <strong>{{ branding.name() }}</strong>
            <small>Reservas & Complejos</small>
          </div>
        </div>

        <nav class="sidebar-nav">
          @if (auth.can('canchas.ver') || auth.can('deportes.ver') || auth.can('sucursales.ver') || auth.can('negocio.ver') || auth.can('politicas.ver')) {
            <div class="nav-section">
              <span class="nav-section-label">Espacios deportivos</span>
              <a *appCan="'canchas.ver'" class="nav-item" routerLink="/canchas" routerLinkActive="active" (click)="navigated.emit()"><span class="material-symbols-outlined">sports_soccer</span><span>Canchas</span></a>
              <a *appCan="'deportes.ver'" class="nav-item" routerLink="/deportes" routerLinkActive="active" (click)="navigated.emit()"><span class="material-symbols-outlined">sports</span><span>Deportes</span></a>
              <a *appCan="'sucursales.ver'" class="nav-item" routerLink="/sucursales" routerLinkActive="active" (click)="navigated.emit()"><span class="material-symbols-outlined">location_on</span><span>Sucursales</span></a>
              <a *appCan="'politicas.ver'" class="nav-item" routerLink="/politicas" routerLinkActive="active" (click)="navigated.emit()"><span class="material-symbols-outlined">policy</span><span>Politicas</span></a>
              <a *appCan="'negocio.ver'; global: true" class="nav-item" routerLink="/negocio" routerLinkActive="active" (click)="navigated.emit()"><span class="material-symbols-outlined">storefront</span><span>Negocio</span></a>
            </div>
          }
          <div class="nav-section" *appCan="'dashboard.ver'">
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

          @if (auth.can('usuarios.ver') || auth.can('roles.ver') || auth.can('permisos.ver')) {
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
            <a *appCan="'usuarios.ver'" class="nav-item" routerLink="/usuarios" routerLinkActive="active" (click)="navigated.emit()">
              <span class="material-symbols-outlined">group</span>
              <span>Usuarios</span>
            </a>
            <a *appCan="'roles.ver'" class="nav-item" routerLink="/roles" routerLinkActive="active" (click)="navigated.emit()">
              <span class="material-symbols-outlined">admin_panel_settings</span>
              <span>Roles</span>
            </a>
            <a *appCan="'permisos.ver'" class="nav-item" routerLink="/permisos" routerLinkActive="active" (click)="navigated.emit()">
              <span class="material-symbols-outlined">key</span>
              <span>Permisos</span>
            </a>
            </div>
          </div>
          }
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
  readonly branding = inject(BrandingService);
  readonly auth = inject(AuthService);
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
