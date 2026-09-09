import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { TextareaComponent } from '../../../shared/components/textarea/textarea.component';
import { CheckboxComponent } from '../../../shared/components/checkbox/checkbox.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

export interface AccessFormData {
  nombre: string;
  descripcion?: string;
  estado?: boolean;
}

@Component({
  selector: 'app-access-form-modal',
  imports: [ReactiveFormsModule, ModalComponent, InputComponent, TextareaComponent, CheckboxComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" [title]="(data() ? 'Editar ' : 'Nuevo ') + entity()"
      [icon]="entity() === 'rol' ? 'badge' : 'key'" [busy]="saving()" (closed)="cancelled.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="modal-body form-stack">
          <app-input label="Nombre" formControlName="nombre" [required]="true"
            [placeholder]="entity() === 'rol' ? 'Administrador' : 'acceso_usuarios'"
            [errorMessage]="form.controls.nombre.touched && form.controls.nombre.invalid ? 'Este campo es requerido.' : ''" />
          <app-textarea label="Descripcion" formControlName="descripcion" />
          @if (data() && canChangeState()) {
            <app-checkbox formControlName="estado" [label]="entity() === 'rol' ? 'Rol activo' : 'Permiso activo'" />
          }
        </div>
        <div class="modal-footer">
          <app-button variant="outline-secondary" [disabled]="saving()" (clicked)="cancelled.emit()">Cancelar</app-button>
          <app-button type="submit" icon="save" [loading]="saving()">Guardar</app-button>
        </div>
      </form>
    </app-modal>
  `,
})
export class AccessFormModalComponent {
  readonly open = input(false);
  readonly saving = input(false);
  readonly canChangeState = input(true);
  readonly entity = input.required<'rol' | 'permiso'>();
  readonly data = input<AccessFormData | null>(null);
  readonly saved = output<AccessFormData>();
  readonly cancelled = output<void>();
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required], descripcion: [''], estado: [true],
  });

  constructor() {
    effect(() => {
      if (this.open()) this.form.reset({
        nombre: this.data()?.nombre ?? '', descripcion: this.data()?.descripcion ?? '',
        estado: this.data()?.estado ?? true,
      });
    });
  }

  submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saved.emit(this.form.getRawValue());
  }
}
