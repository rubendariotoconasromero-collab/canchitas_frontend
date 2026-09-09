import { TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BrandingService } from '../../../core/services/branding.service';

describe('LoginComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();
  });

  it('renders branding, features and login form elements', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.auth-brand-title')?.textContent).toContain('Soccer Real Madrid');
    TestBed.inject(BrandingService).name.set('Nombre actualizado');
    fixture.detectChanges();
    expect(el.querySelector('.auth-brand-title')?.textContent).toContain('Nombre actualizado');
    expect(el.querySelector('.auth-form-title')?.textContent).toContain('Iniciar Sesión');
    expect(el.querySelectorAll('.auth-feature-item').length).toBe(3);
    expect(el.querySelector('button[type="submit"]')?.textContent).toContain('Ingresar');
  });

  it('submits valid credentials and navigates to dashboard', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    authServiceSpy.login.and.returnValue(of({ token: 'mock-token' } as any));

    component.form.setValue({
      correo: 'admin@canchitas.com',
      password: 'SecretPassword123',
    });

    component.submit();

    expect(authServiceSpy.login).toHaveBeenCalledWith('admin@canchitas.com', 'SecretPassword123');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('displays styled alert when authentication fails', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    authServiceSpy.login.and.returnValue(
      throwError(() => ({ error: { detail: 'Credenciales inválidas.' } }))
    );

    component.form.setValue({
      correo: 'admin@canchitas.com',
      password: 'WrongPassword',
    });

    component.submit();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const errorAlert = el.querySelector('.auth-error-alert');
    expect(errorAlert).toBeTruthy();
    expect(errorAlert?.textContent).toContain('Credenciales inválidas.');
  });
});
