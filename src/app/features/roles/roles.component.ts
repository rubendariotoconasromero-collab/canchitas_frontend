import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { apiError } from '../../core/utils/api-error';
import { CanDirective } from '../../shared/directives/can.directive';
import { AuthService } from '../../core/services/auth.service';
import { ListToolbarComponent } from '../../shared/components/list-toolbar/list-toolbar.component';
import { TableComponent } from '../../shared/components/table/table.component';
import { ListShellComponent } from '../../shared/components/list-shell/list-shell.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { CheckboxComponent } from '../../shared/components/checkbox/checkbox.component';
import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { AccessFormModalComponent, AccessFormData } from '../access/components/access-form-modal.component';

import { Permiso, Rol } from '../../core/models/auth.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { DropdownComponent, DropdownItemComponent } from '../../shared/components/dropdown';
import { RolPayload, RolService } from './rol.service';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [TableComponent,CanDirective, PageHeaderComponent, ListToolbarComponent, ListShellComponent, ModalComponent, CheckboxComponent, AccessFormModalComponent, ButtonComponent, BadgeComponent, ConfirmationModalComponent, DropdownComponent, DropdownItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="main-content">
      <app-page-header title="Roles" icon="badge">
        <app-button *appCan="'roles.crear'; global: true" icon="add" (clicked)="openCreate()">Nuevo rol</app-button>
      </app-page-header>

      <app-list-toolbar searchLabel="Buscar rol" entity="roles"
        [total]="roles().length" [active]="activos()" [(query)]="query" [showRefresh]="true" [loading]="loading()" (refreshed)="load()" />

      <app-list-shell [loading]="loading()" [error]="loadError()"
        [empty]="filteredRoles().length === 0" (retry)="load()"><app-table label="Roles" minWidth="720px" class="roles-list">
        <thead><tr>
          <th scope="col">ID</th>
          <th scope="col">Nombre</th>
          <th scope="col" class="hide-sm">Descripcion</th>
          <th scope="col" class="text-center">Permisos</th>
          <th scope="col" class="text-center">Estado</th>
          @if(showActions){<th scope="col" class="text-center">Acciones</th>}
        </tr></thead><tbody>

          @for (rol of filteredRoles(); track rol.id) {
            <tr>
              <td class="table-id">#{{ rol.id }}</td>
              <td class="table-bold">{{ rol.nombre }}</td>
              <td class="hide-sm table-muted">{{ rol.descripcion || 'Sin descripcion' }}</td>
              <td class="text-center">{{ rol.permisos?.length ?? 0 }}</td>
              <td class="text-center"><app-badge [active]="rol.estado" /></td>
              @if(showActions){<td class="table-actions">
                <app-dropdown align="end" [title]="'Acciones para ' + rol.nombre">
                  <app-dropdown-item
                    *appCan="'roles.asignar_permisos'; global: true"
                    icon="rule"
                    label="Asignar permisos"
                    (clicked)="openPermisos(rol)"
                  />
                  <app-dropdown-item
                    *appCan="'roles.editar'; global: true"
                    icon="edit"
                    label="Editar rol"
                    (clicked)="openEdit(rol)"
                  />
                  <app-dropdown-item
                    *appCan="'roles.cambiar_estado'; global: true"
                    [icon]="rol.estado ? 'toggle_off' : 'toggle_on'"
                    [label]="rol.estado ? 'Desactivar rol' : 'Activar rol'"
                    [danger]="rol.estado"
                    (clicked)="confirmToggle(rol)"
                  />
                </app-dropdown>
              </td>}
            </tr>
          }
      </tbody></app-table></app-list-shell>
    </div>

    <app-access-form-modal entity="rol" [open]="showModal()" [data]="formData()"
      [canChangeState]="auth.can('roles.cambiar_estado', true)"
      [saving]="saving()" (saved)="save($event)" (cancelled)="showModal.set(false)" />

    <app-modal [open]="showPermisos()" [title]="'Permisos de ' + (permisoTarget()?.nombre ?? '')"
      icon="rule" size="wide" [busy]="savingPermisos()" (closed)="showPermisos.set(false)">
          <div class="modal-body">
            <div class="as-list">
              <div class="as-group">
                <div class="as-group-head">
                  <span>Permisos disponibles</span>
                  <app-button size="sm" variant="outline-primary" (clicked)="toggleAllPermisos()">
                    {{ allPermisosSelected() ? 'Quitar todos' : 'Marcar todos' }}
                  </app-button>
                </div>
                <div class="as-group-body">
                  @for (permiso of permisos(); track permiso.id) {
                    <app-checkbox [label]="permiso.nombre" [checked]="selectedPermisos().has(permiso.id)" (checkedChange)="togglePermiso(permiso.id)" />
                  }
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <app-button variant="outline-secondary" [disabled]="savingPermisos()" (clicked)="showPermisos.set(false)">Cancelar</app-button>
            <app-button variant="primary" icon="save" [loading]="savingPermisos()" (clicked)="savePermisos()">Guardar permisos</app-button>
          </div>
    </app-modal>

    <app-confirmation-modal
      [open]="showConfirm()"
      [title]="(toggleTarget()?.estado ? 'Desactivar' : 'Activar') + ' rol'"
      [message]="'Deseas ' + (toggleTarget()?.estado ? 'desactivar' : 'activar') + ' el rol ' + (toggleTarget()?.nombre ?? '') + '?'"
      [variant]="toggleTarget()?.estado ? 'danger' : 'primary'"
      [confirmLabel]="toggleTarget()?.estado ? 'Desactivar' : 'Activar'"
      (confirmed)="doToggle()"
      (cancelled)="showConfirm.set(false)"
    />
  `,
})
export class RolesComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly service = inject(RolService);
  private readonly snackbar = inject(SnackbarService);
  readonly formData = signal<AccessFormData | null>(null);

  readonly roles = signal<Rol[]>([]);
  readonly permisos = signal<Permiso[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly query = signal('');
  readonly showModal = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly showConfirm = signal(false);
  readonly toggleTarget = signal<Rol | null>(null);
  readonly showPermisos = signal(false);
  readonly permisoTarget = signal<Rol | null>(null);
  readonly selectedPermisos = signal<Set<number>>(new Set());
  readonly savingPermisos = signal(false);


  readonly activos = computed(() => this.roles().filter((rol) => rol.estado).length);
  readonly filteredRoles = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) return this.roles();
    return this.roles().filter((rol) => `${rol.nombre} ${rol.descripcion ?? ''}`.toLowerCase().includes(term));
  });

  get showActions(): boolean { return ['roles.asignar_permisos', 'roles.editar', 'roles.cambiar_estado'].some(permission => this.auth.can(permission, true)); }

  ngOnInit(): void {
    this.load();
    if (this.auth.can('roles.asignar_permisos', true)) this.service.permisos().subscribe({
      next: (permisos) => this.permisos.set(permisos),
      error: () => this.snackbar.error('No se pudieron cargar los permisos.'),
    });
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.service.listar().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudo cargar la lista. Intenta nuevamente.');
        this.snackbar.error('No se pudo cargar roles.');
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formData.set(null);
    this.showModal.set(true);
  }

  openEdit(rol: Rol): void {
    this.editingId.set(rol.id);
    this.formData.set(rol);
    this.showModal.set(true);
  }

  save(payload: RolPayload): void {
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
        this.snackbar.error(apiError(err, 'No se pudo guardar el rol.'));
      },
    });
  }

  openPermisos(rol: Rol): void {
    this.permisoTarget.set(rol);
    this.selectedPermisos.set(new Set());
    this.service.getPermisos(rol.id).subscribe({
      next: (response) => {
        this.selectedPermisos.set(new Set(response.data));
        this.showPermisos.set(true);
      },
      error: () => this.snackbar.error('No se pudieron cargar permisos del rol.'),
    });
  }

  togglePermiso(id: number): void {
    const next = new Set(this.selectedPermisos());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedPermisos.set(next);
  }

  allPermisosSelected(): boolean {
    return this.permisos().length > 0 && this.permisos().every((permiso) => this.selectedPermisos().has(permiso.id));
  }

  toggleAllPermisos(): void {
    this.selectedPermisos.set(this.allPermisosSelected() ? new Set() : new Set(this.permisos().map((permiso) => permiso.id)));
  }

  savePermisos(): void {
    if (this.savingPermisos()) return;
    const rol = this.permisoTarget();
    if (!rol) return;
    this.savingPermisos.set(true);
    this.service.syncPermisos(rol.id, [...this.selectedPermisos()]).subscribe({
      next: (response) => {
        this.savingPermisos.set(false);
        this.showPermisos.set(false);
        this.snackbar.success(response.message);
        this.load();
      },
      error: err => {
        this.savingPermisos.set(false);
        this.snackbar.error(apiError(err, 'No se pudieron guardar permisos.'));
      },
    });
  }

  confirmToggle(rol: Rol): void {
    this.toggleTarget.set(rol);
    this.showConfirm.set(true);
  }

  doToggle(): void {
    const rol = this.toggleTarget();
    if (!rol) return;
    this.showConfirm.set(false);
    this.service.cambiarEstado(rol.id).subscribe({
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
