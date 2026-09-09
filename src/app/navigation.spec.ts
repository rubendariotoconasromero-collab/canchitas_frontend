import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';

describe('Shared layout navigation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes), provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: {
          isAuthenticated: () => true,
          can: () => true,
          me: () => of({ user: { nombre: 'Prueba', correo: 'prueba@example.test' } }),
          currentUser: () => ({ nombre: 'Prueba', correo: 'prueba@example.test' }),
          logout: () => of({ message: 'ok' }),
        } },
      ],
    });
  });

  it('opens the access group on deep links and navigates through all screens', async () => {
    const harness = await RouterTestingHarness.create('/roles');
    const http = TestBed.inject(HttpTestingController);
    const flushLists = () => http.match(() => true).forEach(request => request.flush([]));
    flushLists();
    harness.detectChanges();
    const sidebar = harness.routeNativeElement!.querySelector('app-sidebar')!;
    expect(sidebar.querySelector('[aria-controls="access-submenu"]')?.getAttribute('aria-expanded')).toBe('true');
    for (const [path, heading] of [['usuarios', 'Gestion de usuarios'], ['permisos', 'Gestion de permisos'], ['dashboard', 'Resumen general']]) {
      (sidebar.querySelector('a[href="/' + path + '"]') as HTMLAnchorElement).click();
      await harness.fixture.whenStable();
      flushLists();
      harness.detectChanges();
      expect(harness.routeNativeElement!.querySelector('app-topbar h1')?.textContent).toBe(heading);
      expect(harness.routeNativeElement!.querySelector('a.active')?.getAttribute('href')).toBe('/' + path);
    }
    http.verify();
  });
});
