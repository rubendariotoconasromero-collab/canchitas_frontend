import { CheckboxComponent } from '../../../shared/components/checkbox/checkbox.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Sucursal } from '../../../core/models/auth.model';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { SelectComponent, SelectOption } from '../../../shared/components/select/select.component';
import { UsuarioPayload } from '../usuario.service';

export interface UsuarioFormData {
  nombre: string;
  correo: string;
  sucursal_id: number | null;
  estado: boolean;
}

@Component({
  selector: 'app-usuario-modal',
  standalone: true,
  imports: [CheckboxComponent, ModalComponent, ReactiveFormsModule, ButtonComponent, InputComponent, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-modal [open]="open()" [title]="editing() ? 'Editar usuario' : 'Nuevo usuario'" icon="person" size="normal" [busy]="saving()" (closed)="cancelled.emit()">
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="modal-body">
              <div class="mb-3">
                <app-input
                  label="Nombre"
                  formControlName="nombre"
                  [required]="true"
                  [errorMessage]="err('nombre')"
                  placeholder="Nombre completo"
                />
              </div>

              <div class="mb-3">
                <app-input
                  label="Correo"
                  type="email"
                  formControlName="correo"
                  [required]="true"
                  [errorMessage]="err('correo')"
                  placeholder="usuario@ejemplo.com"
                />
              </div>

              <div class="mb-3">
                <app-input
                  label="Password"
                  formControlName="password"
                  [showToggle]="true"
                  [required]="!editing()"
                  [errorMessage]="err('password')"
                  [hint]="editing() ? 'Dejalo vacio para no cambiarlo.' : 'Usa al menos 8 caracteres.'"
                />
              </div>

              <div class="mb-3">
                <app-select
                  label="Sucursal"
                  formControlName="sucursal_id"
                  [options]="sucursalOptions()"
                  placeholder="Sin sucursal"
                />
              </div>

              @if (editing() && canChangeState()) {
                <app-checkbox formControlName="estado" label="Usuario activo" />
              }
            </div>

            <div class="modal-footer">
              <app-button variant="outline-secondary" [disabled]="saving()" type="button" (clicked)="cancelled.emit()">Cancelar</app-button>
              <app-button variant="primary" type="submit" [loading]="saving()" icon="save">Guardar</app-button>
            </div>
          </form>
    </app-modal>
  `,
})
export class UsuarioModalComponent {
  private readonly fb = inject(FormBuilder);

  open = input(false);
  editing = input(false);
  saving = input(false);
  canChangeState = input(true);
  data = input<UsuarioFormData | null>(null);
  sucursales = input<Sucursal[]>([]);

  @Output() saved = new EventEmitter<UsuarioPayload>();
  @Output() cancelled = new EventEmitter<void>();

  readonly sucursalOptions = computed<SelectOption[]>(() =>
    this.sucursales().map((sucursal) => ({
      value: String(sucursal.id),
      label: sucursal.nombre,
    })),
  );

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    correo: ['', [Validators.required, Validators.email]],
    password: [''],
    sucursal_id: [''],
    estado: [true],
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }

      const data = this.data();
      this.form.reset({
        nombre: data?.nombre ?? '',
        correo: data?.correo ?? '',
        password: '',
        sucursal_id: data?.sucursal_id != null ? String(data.sucursal_id) : '',
        estado: data?.estado ?? true,
      });

      const password = this.form.get('password');
      password?.setValidators(this.editing() ? [Validators.minLength(8)] : [Validators.required, Validators.minLength(8)]);
      password?.updateValueAndValidity();
    });
  }

  err(field: string): string {
    const control = this.form.get(field);
    if (!control || !control.touched || control.valid) {
      return '';
    }
    if (control.errors?.['required']) {
      return 'Este campo es requerido.';
    }
    if (control.errors?.['email']) {
      return 'Correo invalido.';
    }
    if (control.errors?.['minlength']) {
      return 'Minimo 8 caracteres.';
    }
    return 'Valor invalido.';
  }

  submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const payload: UsuarioPayload = {
      nombre: value.nombre ?? '',
      correo: value.correo ?? '',
      sucursal_id: value.sucursal_id ? Number(value.sucursal_id) : null,
    };

    if (value.password?.trim()) {
      payload.password = value.password;
    }
    if (this.editing()) {
      payload.estado = !!value.estado;
    }

    this.saved.emit(payload);
  }
}
