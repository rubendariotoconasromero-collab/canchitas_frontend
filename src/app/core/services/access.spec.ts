import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { CanDirective } from '../../shared/directives/can.directive';
import { permissionGuard } from '../guards/permission.guard';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { Usuario } from '../models/auth.model';

@Component({ imports: [CanDirective], template: `
  <button *appCan="'usuarios.editar'">Editar</button>
  <button *appCan="'roles.editar'; global: true">Editar rol</button>` })
class ActionsHost {}

describe('Effective access and session', () => {
  const user: Usuario = { id: 1, nombre: 'Test', correo: 'test@example.test', estado: true,
    permisos_efectivos: ['usuarios.ver'], alcance_global: false };
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    TestBed.inject(StorageService).setSession('test-token', user);
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.clear(); sessionStorage.clear(); });

  it('hides write actions and reacts to permission revocation', () => {
    const fixture = TestBed.createComponent(ActionsHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(0);
    auth.user.set({ ...user, permisos_efectivos: ['usuarios.editar', 'roles.editar'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(1);
    auth.user.set({ ...user, alcance_global: true, permisos_efectivos: ['roles.editar'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Editar rol');
    auth.user.set({ ...user, permisos_efectivos: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(0);
  });

  async function checkRoute(permission: string) {
    const route = { data: { permission } } as unknown as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => permissionGuard(route, {} as RouterStateSnapshot));
    const promise = firstValueFrom(result as Observable<unknown>);
    http.expectOne(API_ENDPOINTS.me).flush({ user });
    return promise;
  }

  it('checks the server before allowing a deep link', async () => {
    expect(await checkRoute('usuarios.ver')).toBe(true);
  });

  it('rejects a forbidden deep link', async () => {
    expect(String(await checkRoute('roles.ver'))).toBe('/sin-acceso');
  });

  it('chooses an allowed home when dashboard permission is absent', async () => {
    expect(String(await checkRoute('dashboard.ver'))).toBe('/usuarios');
  });

  it('clears a revoked session on 401', () => {
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    auth.me().subscribe({ error: () => {} });
    const request = http.expectOne(API_ENDPOINTS.me);
    expect(request.request.headers.get('Authorization')).toBe('Token test-token');
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.currentUser()).toBeNull();
    expect(auth.isAuthenticated()).toBeFalse();
  });

  it('does not send a token to another server', () => {
    TestBed.inject(HttpClient).get('https://example.test/file').subscribe();
    const request = http.expectOne('https://example.test/file');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });

  it('refreshes permissions after a forbidden action without discarding the session', () => {
    TestBed.inject(HttpClient).get(API_ENDPOINTS.usuarios).subscribe({ error: () => {} });
    http.expectOne(API_ENDPOINTS.usuarios).flush({}, { status: 403, statusText: 'Forbidden' });
    http.expectOne(API_ENDPOINTS.me).flush({ user: { ...user, permisos_efectivos: [] } });
    expect(auth.can('usuarios.ver')).toBeFalse();
    expect(auth.isAuthenticated()).toBeTrue();
  });

  it('clears local state even when logout fails', () => {
    auth.logout().subscribe({ error: () => {} });
    http.expectOne(API_ENDPOINTS.logout).flush({}, { status: 500, statusText: 'Error' });
    expect(auth.currentUser()).toBeNull();
    expect(auth.isAuthenticated()).toBeFalse();
  });
});
