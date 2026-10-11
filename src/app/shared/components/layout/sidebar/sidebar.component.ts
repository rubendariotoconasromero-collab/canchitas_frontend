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
      <aside id="main-sidebar" class="sidebar" aria-label="Navegacion principal">
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
          @if(auth.can('reservas.ver') || auth.can('clientes.ver')) {
            <div class="nav-section">
              <a *appCan="'reservas.ver'" class="nav-item" routerLink="/agenda" routerLinkActive="active" title="Agenda de reservas" (click)="navigated.emit()"><span class="material-symbols-outlined" aria-hidden="true">calendar_month</span><span>Agenda de reservas</span></a>
              <a *appCan="'clientes.ver'" class="nav-item" routerLink="/clientes" routerLinkActive="active" title="Clientes" (click)="navigated.emit()"><span class="material-symbols-outlined" aria-hidden="true">contact_phone</span><span>Clientes</span></a>
            </div>
          }
          <div class="nav-section" *appCan="'caja.ver'"><a class="nav-item" routerLink="/caja" routerLinkActive="active" title="Caja" (click)="navigated.emit()"><span class="material-symbols-outlined" aria-hidden="true">payments</span><span>Caja</span></a></div>
          <div class="nav-section" *appCan="'dashboard.ver'">
            <a class="nav-item" routerLink="/dashboard" routerLinkActive="active" ariaCurrentWhenActive="page"
              [routerLinkActiveOptions]="{ exact: true }" title="Dashboard" (click)="navigated.emit()">
              <span class="material-symbols-outlined" aria-hidden="true">space_dashboard</span>
              <span>Dashboard</span>
            </a>
          </div>
          @if (auth.can('canchas.ver') || auth.can('deportes.ver')) {
            <div class="nav-section">
              <button type="button" class="nav-item nav-group-toggle" title="Espacios deportivos"
                [class.group-active]="catalogActive()" [attr.aria-expanded]="catalogExpanded()"
                aria-controls="catalog-submenu" (click)="toggleCatalog()">
                <span class="material-symbols-outlined" aria-hidden="true">sports_soccer</span>
                <span>Espacios deportivos</span>
                <span class="material-symbols-outlined nav-chevron" aria-hidden="true">{{ catalogExpanded() ? 'expand_less' : 'expand_more' }}</span>
              </button>
              <div id="catalog-submenu" class="nav-submenu" [hidden]="!catalogExpanded()">
              <a *appCan="'canchas.ver'" class="nav-item" routerLink="/canchas" routerLinkActive="active" (click)="navigated.emit()"><span class="material-symbols-outlined">sports_soccer</span><span>Canchas</span></a>
              <a *appCan="'deportes.ver'" class="nav-item" routerLink="/deportes" routerLinkActive="active" (click)="navigated.emit()"><span class="material-symbols-outlined">sports</span><span>Deportes</span></a>
              </div>
            </div>
          }

          @if (auth.can('negocio.ver', true) || auth.can('sucursales.ver') || auth.can('politicas.ver') || auth.can('caja.configurar', true)) {
            <div class="nav-section">
              <button type="button" class="nav-item nav-group-toggle" title="Configuracion del negocio"
                [class.group-active]="businessActive()" [attr.aria-expanded]="businessExpanded()"
                aria-controls="business-submenu" (click)="toggleBusiness()">
                <span class="material-symbols-outlined" aria-hidden="true">storefront</span>
                <span>Configuracion del negocio</span>
                <span class="material-symbols-outlined nav-chevron" aria-hidden="true">{{ businessExpanded() ? 'expand_less' : 'expand_more' }}</span>
              </button>
              <div id="business-submenu" class="nav-submenu" [hidden]="!businessExpanded()">
              <a *appCan="'negocio.ver'; global: true" class="nav-item" routerLink="/negocio" routerLinkActive="active" (click)="navigated.emit()"><span class="material-symbols-outlined">storefront</span><span>Negocio</span></a>
              <a *appCan="'sucursales.ver'" class="nav-item" routerLink="/sucursales" routerLinkActive="active" (click)="navigated.emit()"><span class="material-symbols-outlined">location_on</span><span>Sucursales</span></a>
              <a *appCan="'politicas.ver'" class="nav-item" routerLink="/politicas" routerLinkActive="active" (click)="navigated.emit()"><span class="material-symbols-outlined">policy</span><span>Politicas de reserva</span></a>
              <a *appCan="'caja.configurar'; global: true" class="nav-item" routerLink="/administracion-cajas" routerLinkActive="active" (click)="navigated.emit()"><span class="material-symbols-outlined">payments</span><span>Administracion de cajas</span></a>
              </div>
            </div>
          }

          @if (auth.can('usuarios.ver') || auth.can('roles.ver') || auth.can('permisos.ver')) {
          <div class="nav-section">
            <button
              type="button"
              class="nav-item nav-group-toggle"
              [class.group-active]="accessActive()"
              [attr.aria-expanded]="accessExpanded()"
              aria-controls="access-submenu"
              title="Usuarios y accesos"
              (click)="toggleAccess()"
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
  readonly compact = input(false);
  readonly expandRequested = output<void>();
  readonly navigated = output<void>();
  readonly signedOut = output<void>();
  private readonly router = inject(Router);
  readonly accessActive = signal(this.isAccessRoute(this.router.url));
  readonly accessExpanded = signal(this.isAccessRoute(this.router.url));
  readonly catalogActive = signal(this.isCatalogRoute(this.router.url));
  readonly catalogExpanded = signal(this.isCatalogRoute(this.router.url));
  readonly businessActive = signal(this.isBusinessRoute(this.router.url));
  readonly businessExpanded = signal(this.isBusinessRoute(this.router.url));

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe(event => {
      this.accessActive.set(this.isAccessRoute(event.urlAfterRedirects));
      if (this.accessActive()) this.accessExpanded.set(true);
      this.catalogActive.set(this.isCatalogRoute(event.urlAfterRedirects));
      if (this.catalogActive()) this.catalogExpanded.set(true);
      this.businessActive.set(this.isBusinessRoute(event.urlAfterRedirects));
      if (this.businessActive()) this.businessExpanded.set(true);
    });
  }

  private isAccessRoute(url: string): boolean {
    return /^\/(usuarios|roles|permisos)(?:[/?#]|$)/.test(url);
  }

  toggleAccess(): void {
    this.accessExpanded.set(this.compact() || !this.accessExpanded());
    if (this.compact()) this.expandRequested.emit();
  }

  toggleCatalog(): void {
    this.catalogExpanded.set(this.compact() || !this.catalogExpanded());
    if (this.compact()) this.expandRequested.emit();
  }

  private isCatalogRoute(url: string): boolean {
    return /^\/(canchas|deportes)(?:[/?#]|$)/.test(url);
  }

  toggleBusiness(): void {
    this.businessExpanded.set(this.compact() || !this.businessExpanded());
    if (this.compact()) this.expandRequested.emit();
  }

  private isBusinessRoute(url: string): boolean {
    return /^\/(negocio|sucursales|politicas|administracion-cajas)(?:[/?#]|$)/.test(url);
  }
}
