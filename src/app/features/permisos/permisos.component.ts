import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { apiError } from '../../core/utils/api-error';
import { CanDirective } from '../../shared/directives/can.directive';
import { AuthService } from '../../core/services/auth.service';
import { ListToolbarComponent } from '../../shared/components/list-toolbar/list-toolbar.component';
import { TableComponent } from '../../shared/components/table/table.component';
import { ListShellComponent } from '../../shared/components/list-shell/list-shell.component';
import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { AccessFormModalComponent, AccessFormData } from '../access/components/access-form-modal.component';

import { Permiso } from '../../core/models/auth.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { DropdownComponent, DropdownItemComponent } from '../../shared/components/dropdown';
import { PermisoPayload, PermisoService } from './permiso.service';

@Component({
  selector: 'app-permisos',
  standalone: true,
  imports: [TableComponent,CanDirective, PageHeaderComponent, ListToolbarComponent, ListShellComponent, AccessFormModalComponent, ButtonComponent, BadgeComponent, ConfirmationModalComponent, DropdownComponent, DropdownItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="main-content">
      <app-page-header title="Permisos" icon="rule">
        <app-button *appCan="'permisos.crear'; global: true" icon="add" (clicked)="openCreate()">Nuevo permiso</app-button>
      </app-page-header>

      <app-list-toolbar searchLabel="Buscar permiso" entity="permisos"
        [total]="permisos().length" [active]="activos()" [(query)]="query" [showRefresh]="true" [loading]="loading()" (refreshed)="load()" />

      <app-list-shell [loading]="loading()" [error]="loadError()"
        [empty]="filteredPermisos().length === 0" (retry)="load()"><app-table label="Permisos" minWidth="640px" class="permisos-list">
        <thead><tr>
          <th scope="col">ID</th>
          <th scope="col">Nombre</th>
          <th scope="col" class="hide-sm">Descripcion</th>
          <th scope="col" class="text-center">Estado</th>
          @if(showActions){<th scope="col" class="text-center">Acciones</th>}
        </tr></thead><tbody>

          @for (permiso of filteredPermisos(); track permiso.id) {
            <tr>
              <td class="table-id">#{{ permiso.id }}</td>
              <td class="table-bold">{{ permiso.nombre }}</td>
              <td class="hide-sm table-muted">{{ permiso.descripcion || 'Sin descripcion' }}</td>
              <td class="text-center"><app-badge [active]="permiso.estado" /></td>
              @if(showActions){<td class="table-actions">
                <app-dropdown align="end" [title]="'Acciones para ' + permiso.nombre">
                  <app-dropdown-item
                    *appCan="'permisos.editar'; global: true"
                    icon="edit"
                    label="Editar permiso"
                    (clicked)="openEdit(permiso)"
                  />
                  <app-dropdown-item
                    *appCan="'permisos.cambiar_estado'; global: true"
                    [icon]="permiso.estado ? 'toggle_off' : 'toggle_on'"
                    [label]="permiso.estado ? 'Desactivar permiso' : 'Activar permiso'"
                    [danger]="permiso.estado"
                    (clicked)="confirmToggle(permiso)"
                  />
                </app-dropdown>
              </td>}
            </tr>
          }
      </tbody></app-table></app-list-shell>
    </div>

    <app-access-form-modal entity="permiso" [open]="showModal()" [data]="formData()"
      [canChangeState]="auth.can('permisos.cambiar_estado', true)"
      [saving]="saving()" (saved)="save($event)" (cancelled)="showModal.set(false)" />

    <app-confirmation-modal
      [open]="showConfirm()"
      [title]="(toggleTarget()?.estado ? 'Desactivar' : 'Activar') + ' permiso'"
      [message]="'Deseas ' + (toggleTarget()?.estado ? 'desactivar' : 'activar') + ' el permiso ' + (toggleTarget()?.nombre ?? '') + '?'"
      [variant]="toggleTarget()?.estado ? 'danger' : 'primary'"
      [confirmLabel]="toggleTarget()?.estado ? 'Desactivar' : 'Activar'"
      (confirmed)="doToggle()"
      (cancelled)="showConfirm.set(false)"
    />
  `,
})
export class PermisosComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly service = inject(PermisoService);
  private readonly snackbar = inject(SnackbarService);
  readonly formData = signal<AccessFormData | null>(null);

  readonly permisos = signal<Permiso[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly query = signal('');
  readonly showModal = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly showConfirm = signal(false);
  readonly toggleTarget = signal<Permiso | null>(null);


  readonly activos = computed(() => this.permisos().filter((permiso) => permiso.estado).length);
  readonly filteredPermisos = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) return this.permisos();
    return this.permisos().filter((permiso) => `${permiso.nombre} ${permiso.descripcion ?? ''}`.toLowerCase().includes(term));
  });

  get showActions(): boolean { return ['permisos.editar', 'permisos.cambiar_estado'].some(permission => this.auth.can(permission, true)); }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.service.listar().subscribe({
      next: (permisos) => {
        this.permisos.set(permisos);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudo cargar la lista. Intenta nuevamente.');
        this.snackbar.error('No se pudo cargar permisos.');
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formData.set(null);
    this.showModal.set(true);
  }

  openEdit(permiso: Permiso): void {
    this.editingId.set(permiso.id);
    this.formData.set(permiso);
    this.showModal.set(true);
  }

  save(payload: PermisoPayload): void {
    if (this.saving()) return;
    const id = this.editingId();
    const request = id === null ? this.service.crear(payload) : this.service.actualizar(id, payload);
    this.saving.set(true);
    request.subscribe({
      next: (response) => {
        this.saving.set(false);
        this.showModal.set(false);
        this.snackbar.success(response.message);
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.snackbar.error(apiError(err, 'No se pudo guardar el permiso.'));
      },
    });
  }

  confirmToggle(permiso: Permiso): void {
    this.toggleTarget.set(permiso);
    this.showConfirm.set(true);
  }

  doToggle(): void {
    const permiso = this.toggleTarget();
    if (!permiso) return;
    this.showConfirm.set(false);
    this.service.cambiarEstado(permiso.id).subscribe({
      next: (response) => {
        this.snackbar.success(response.message);
        this.load();
      },
      error: err => this.snackbar.error(apiError(err, 'No se pudo cambiar el estado.')),
    });
  }

  editing(): boolean {
    return this.editingId() !== null;
  }
}
