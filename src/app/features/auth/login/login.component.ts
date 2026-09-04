import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent],
  template: `
    <div class="login-card">
      <div class="mb-4">
        <span class="eyebrow">Acceso seguro</span>
        <h1>Canchitas</h1>
        <p>Ingresa con tu cuenta administrativa.</p>
      </div>

      @if (error()) {
        <div class="alert alert-danger py-2">{{ error() }}</div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" class="form-stack" novalidate>
        <app-input label="Correo" type="email" formControlName="correo" autocomplete="email"
          [required]="true" [errorMessage]="form.controls.correo.touched && form.controls.correo.invalid ? 'Ingresa un correo valido.' : ''" />
        <app-input label="Password" type="password" [showToggle]="true" formControlName="password"
          autocomplete="current-password" [required]="true"
          [errorMessage]="form.controls.password.touched && form.controls.password.invalid ? 'Ingresa tu password.' : ''" />
        <app-button type="submit" [fullWidth]="true" [loading]="loading()">Ingresar</app-button>
      </form>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    correo: ['admin@canchitas.com', [Validators.required, Validators.email]],
    password: ['Admin@1234', [Validators.required]],
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
        this.error.set(err?.error?.detail ?? err?.error?.correo?.[0] ?? 'No se pudo iniciar sesion.');
        this.loading.set(false);
      },
    });
  }
}
