import { CheckboxComponent } from '../../../shared/components/checkbox/checkbox.component';
import { EmptyStateComponent } from '../../../shared/components/states/empty-state.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  ViewEncapsulation,
  effect,
  input,
  signal,
} from '@angular/core';

import { Rol } from '../../../core/models/auth.model';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-usuario-asignaciones-modal',
  standalone: true,
  imports: [CheckboxComponent, EmptyStateComponent, ModalComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-modal [open]="open()" [title]="'Accesos de ' + usuarioNombre()" icon="admin_panel_settings" size="wide" [busy]="saving()" (closed)="cancelled.emit()">
          <div class="modal-body">
            <div class="as-list">
              @for (rol of roles(); track rol.id) {
                <div class="as-group">
                  <div class="as-group-head">
                    <span>{{ rol.nombre }}</span>
                    <app-button size="sm" variant="outline-primary" (clicked)="toggleRol(rol)">
                      {{ rolAllSelected(rol) ? 'Quitar todos' : 'Marcar todos' }}
                    </app-button>
                  </div>

                  <div class="as-group-body">
                    @for (permiso of rol.permisos ?? []; track permiso.id) {
                      @if (permiso.pivot?.id; as pivotId) {
                        <app-checkbox [label]="permiso.nombre" [checked]="selectedIds().has(pivotId)" (checkedChange)="toggle(pivotId)" />
                      }
                    }
                  </div>
                </div>
              } @empty {
                <app-empty-state icon="rule" message="No hay roles con permisos configurados." />
              }
            </div>
          </div>

          <div class="modal-footer">
            <app-button variant="outline-secondary" [disabled]="saving()" (clicked)="cancelled.emit()">Cancelar</app-button>
            <app-button variant="primary" [loading]="saving()" icon="save" (clicked)="save()">Guardar accesos</app-button>
          </div>
    </app-modal>
  `,
})
export class UsuarioAsignacionesModalComponent {
  open = input(false);
  usuarioNombre = input('');
  roles = input<Rol[]>([]);
  selected = input<number[]>([]);
  saving = input(false);

  @Output() saved = new EventEmitter<number[]>();
  @Output() cancelled = new EventEmitter<void>();

  readonly selectedIds = signal<Set<number>>(new Set());

  constructor() {
    effect(() => {
      if (this.open()) {
        this.selectedIds.set(new Set(this.selected()));
      }
    });
  }

  private rolPivotIds(rol: Rol): number[] {
    return (rol.permisos ?? [])
      .map((permiso) => permiso.pivot?.id)
      .filter((id): id is number => !!id);
  }

  rolAllSelected(rol: Rol): boolean {
    const ids = this.rolPivotIds(rol);
    return ids.length > 0 && ids.every((id) => this.selectedIds().has(id));
  }

  toggle(id: number): void {
    const next = new Set(this.selectedIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedIds.set(next);
  }

  toggleRol(rol: Rol): void {
    const ids = this.rolPivotIds(rol);
    const next = new Set(this.selectedIds());
    if (this.rolAllSelected(rol)) {
      ids.forEach((id) => next.delete(id));
    } else {
      ids.forEach((id) => next.add(id));
    }
    this.selectedIds.set(next);
  }

  save(): void {
    if (this.saving()) return;
    this.saved.emit([...this.selectedIds()]);
  }
}
