import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { BrandingService } from '../../../core/services/branding.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent, BadgeComponent],
  template: `
    <div class="login-card-master">
      <!-- Identidad del negocio -->
      <div class="auth-showcase">
        <div class="auth-showcase-decor">
          <div class="field-circle"></div>
          <div class="field-line"></div>
        </div>

        <div class="auth-showcase-body">
          <div class="auth-brand-badge">
            <div class="brand-mark auth-logo-mark" aria-hidden="true">
              <img src="escudo-real-madrid.png" alt="Escudo Real Madrid" width="56" height="56" />
            </div>
            <div class="auth-brand-text">
              <span class="auth-brand-title">{{ branding.name() }}</span>
              <span class="auth-brand-tagline">Gestión de Reservas & Espacios Deportivos</span>
            </div>
          </div>

          <div class="auth-showcase-hero">
            <h2>Gestión de reservas y alquiler de espacios deportivos.</h2>
            <p>
              Control total de disponibilidad de canchas, turnos, horarios y administración
              con la excelencia y prestigio de Soccer Real Madrid.
            </p>
          </div>

          <div class="auth-features">
            <div class="auth-feature-item">
              <div class="auth-feature-icon">
                <span class="material-symbols-outlined">calendar_month</span>
              </div>
              <div class="auth-feature-text">
                <strong>Reservas en Tiempo Real</strong>
                <span>Organización ágil de horarios y disponibilidad de canchas.</span>
              </div>
            </div>

            <div class="auth-feature-item">
              <div class="auth-feature-icon">
                <span class="material-symbols-outlined">admin_panel_settings</span>
              </div>
              <div class="auth-feature-text">
                <strong>Control de Usuarios y Roles</strong>
                <span>Permisos granulares y seguridad garantizada para tu personal.</span>
              </div>
            </div>

            <div class="auth-feature-item">
              <div class="auth-feature-icon">
                <span class="material-symbols-outlined">monitoring</span>
              </div>
              <div class="auth-feature-text">
                <strong>Operaciones y Métricas</strong>
                <span>Panel centralizado con reportes operativos al instante.</span>
              </div>
            </div>
          </div>

          <div class="auth-showcase-footer">
            <app-badge label="Sistema Operativo v1.0" tone="success" icon="" />
            <app-badge label="Cifrado Seguro" tone="neutral" icon="lock" />
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Formulario de Login -->
      <div class="auth-form-container">
        <!-- Marca visible solo en dispositivos móviles -->
        <div class="auth-mobile-brand">
          <div class="brand-mark auth-logo-mark" aria-hidden="true">
            <img src="escudo-real-madrid.png" alt="Escudo Real Madrid" width="46" height="46" />
          </div>
          <div>
            <strong>{{ branding.name() }}</strong>
            <small>Complejo Deportivo & Reservas</small>
          </div>
        </div>

        <div class="auth-form-header">
          <div class="auth-access-label"><app-badge label="Acceso Seguro" tone="info" icon="shield" /></div>
          <h1 class="auth-form-title">Iniciar Sesión</h1>
          <p class="auth-form-desc">Ingresa con tus credenciales para acceder al panel administrativo.</p>
        </div>

        @if (error()) {
          <div class="auth-error-alert" role="alert">
            <span class="material-symbols-outlined auth-error-icon">error</span>
            <div class="auth-error-content">
              <strong>Error al ingresar</strong>
              <p>{{ error() }}</p>
            </div>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="form-stack auth-form" novalidate>
          <div class="auth-input-group">
            <app-input
              label="Correo electrónico"
              type="email"
              placeholder="correo@ejemplo.com"
              formControlName="correo"
              autocomplete="email"
              [required]="true"
              [errorMessage]="form.controls.correo.touched && form.controls.correo.invalid ? 'Ingresa un correo electrónico válido.' : ''"
            />
          </div>

          <div class="auth-input-group">
            <app-input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              [showToggle]="true"
              formControlName="password"
              autocomplete="current-password"
              [required]="true"
              [errorMessage]="form.controls.password.touched && form.controls.password.invalid ? 'Ingresa tu contraseña de acceso.' : ''"
            />
          </div>

          <div class="auth-form-options">
            <label class="auth-remember-label">
              <input type="checkbox" class="form-check-input" />
              <span>Recordar sesión</span>
            </label>
            <span class="auth-help-link" title="Consulta con el administrador en caso de problemas con tu cuenta">
              <span class="material-symbols-outlined">help_outline</span>
              ¿Necesitas ayuda?
            </span>
          </div>

          <div class="auth-submit-block">
            <app-button
              type="submit"
              [fullWidth]="true"
              [loading]="loading()"
              icon="login"
              size="lg"
            >
              {{ loading() ? 'Comprobando acceso...' : 'Ingresar' }}
            </app-button>
          </div>
        </form>

        <div class="auth-form-footer">
          <div class="auth-security-legend">
            <span class="material-symbols-outlined">verified_user</span>
            <span>Soccer Real Madrid • Plataforma de Administración Segura</span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  readonly branding = inject(BrandingService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    correo: ['admin@gmail.com', [Validators.required, Validators.email]],
    password: ['password', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.form.value.correo ?? '', this.form.value.password ?? '').subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error.set(
          err?.error?.detail ??
          err?.error?.correo?.[0] ??
          err?.error?.message ??
          (err?.status === 0 ? 'No se pudo conectar con el servidor backend en http://127.0.0.1:8000.' : 'No se pudo iniciar sesión.')
        );
        this.loading.set(false);
      },
    });
  }
}
