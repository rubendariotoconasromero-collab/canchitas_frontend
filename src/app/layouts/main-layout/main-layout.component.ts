import { SidebarComponent } from '../../shared/components/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../shared/components/layout/topbar/topbar.component';
import { StorageService } from '../../core/services/storage.service';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, interval, exhaustMap, catchError, EMPTY, fromEvent, merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { SnackbarComponent } from '../../shared/components/snackbar/snackbar.component';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, SnackbarComponent],
  template: `
    <div class="app-shell" [class.sidebar-open]="menuOpen()">
      <button
        type="button"
        class="sidebar-backdrop"
        aria-label="Cerrar menu"
        (click)="closeMenu()"
      ></button>

      <app-sidebar [userName]="userName" [userEmail]="userEmail" (navigated)="closeMenu()" (signedOut)="logout()" />

      <section class="workspace">
        <app-topbar [title]="pageTitle()" [userName]="userName" (menuRequested)="menuOpen.set(true)" />

        <main class="content-area">
          <router-outlet />
        </main>
      </section>
    </div>
    <app-snackbar />
  `,
})
export class MainLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly menuOpen = signal(false);
  readonly pageTitle = signal(this.resolvePageTitle(this.router.url));

  constructor() {
    merge(interval(30000), fromEvent(window, 'focus')).pipe(
      exhaustMap(() => this.auth.me().pipe(catchError(() => EMPTY))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      const permission = this.router.routerState.snapshot.root.firstChild?.firstChild?.data['permission'];
      if (permission && !this.auth.can(permission)) this.router.navigate(['/sin-acceso']);
    });
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.pageTitle.set(this.resolvePageTitle(event.urlAfterRedirects));
        this.closeMenu();
      });
  }

  get userName(): string {
    return this.auth.currentUser()?.nombre ?? 'Usuario';
  }

  get userEmail(): string {
    return this.auth.currentUser()?.correo ?? '';
  }

  get userInitial(): string {
    return this.userName.charAt(0).toUpperCase();
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => {
        this.storage.clear();
        this.router.navigate(['/login']);
      },
    });
  }

  private resolvePageTitle(url: string): string {
    const segment = url.split('?')[0].split('/').filter(Boolean)[0] ?? 'dashboard';
    const titles: Record<string, string> = {
      canchas: 'Espacios deportivos', deportes: 'Deportes', negocio: 'Negocio',
      sucursales: 'Sucursales', politicas: 'Politicas de reserva',
      dashboard: 'Resumen general',
      usuarios: 'Gestion de usuarios',
      roles: 'Gestion de roles',
      permisos: 'Gestion de permisos',
    };
    return titles[segment] ?? 'Panel administrativo';
  }
}
