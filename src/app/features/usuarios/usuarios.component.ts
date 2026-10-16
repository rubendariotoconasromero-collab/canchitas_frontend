import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { CanDirective } from '../../shared/directives/can.directive';
import { AuthService } from '../../core/services/auth.service';
import { ListToolbarComponent } from '../../shared/components/list-toolbar/list-toolbar.component';
import { TableComponent } from '../../shared/components/table/table.component';
import { ListShellComponent } from '../../shared/components/list-shell/list-shell.component';
import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation, computed, inject, signal } from '@angular/core';

import { Rol, Sucursal, Usuario } from '../../core/models/auth.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { apiError } from '../../core/utils/api-error';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { UsuarioAsignacionesModalComponent } from './components/usuario-asignaciones-modal.component';
import { UsuarioFormData, UsuarioModalComponent } from './components/usuario-modal.component';
import { DropdownComponent, DropdownItemComponent } from '../../shared/components/dropdown';
import { UsuarioPayload, UsuarioService } from './usuario.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [TableComponent,PageHeaderComponent, ListToolbarComponent, ListShellComponent,
    ButtonComponent, CanDirective,
    BadgeComponent,
    ConfirmationModalComponent,
    UsuarioModalComponent,
    UsuarioAsignacionesModalComponent,
    DropdownComponent,
    DropdownItemComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="main-content">
      <app-page-header title="Usuarios" icon="group">
        <app-button *appCan="'usuarios.crear'" icon="add" (clicked)="openCreate()">Nuevo usuario</app-button>
      </app-page-header>

      <app-list-toolbar searchLabel="Buscar usuario" entity="usuarios"
        [total]="usuarios().length" [active]="activos()" [(query)]="query" [showRefresh]="true" [loading]="loading()" (refreshed)="load()" />

      <app-list-shell [loading]="loading()" [error]="loadError()"
        [empty]="filteredUsuarios().length === 0" (retry)="load()"><app-table label="Usuarios" minWidth="800px" class="usuarios-list">
        <thead><tr>
          <th scope="col">ID</th>
          <th scope="col">Nombre</th>
          <th scope="col" class="hide-sm">Correo</th>
          <th scope="col" class="hide-sm">Sucursal</th>
          <th scope="col" class="text-center">Estado</th>
          @if(showActions){<th scope="col" class="text-center">Acciones</th>}
        </tr></thead><tbody>

          @for (usuario of filteredUsuarios(); track usuario.id) {
            <tr>
              <td class="table-id">#{{ usuario.id }}</td>
              <td>
                <div class="user-cell">
                  <span class="avatar">{{ initials(usuario.nombre) }}</span>
                  <div>
                    <strong>{{ usuario.nombre }}</strong>
                    <small>{{ permisosResumen(usuario) }}</small>
                  </div>
                </div>
              </td>
              <td class="hide-sm table-muted">{{ usuario.correo }}</td>
              <td class="hide-sm">{{ usuario.alcance_global ? 'Global' : (usuario.sucursal?.nombre || 'Sin sucursal') }}</td>
              <td class="text-center">
                <app-badge [active]="usuario.estado" />
              </td>
              @if(showActions){<td class="table-actions">
                <app-dropdown align="end" [title]="'Acciones para ' + usuario.nombre">
                  <app-dropdown-item
                    *appCan="'usuarios.asignar_accesos'"
                    icon="admin_panel_settings"
                    label="Gestionar accesos"
                    [disabled]="usuario.id === auth.currentUser()?.id"
                    (clicked)="openAsignaciones(usuario)"
                  />
                  <app-dropdown-item
                    *appCan="'usuarios.editar'"
                    icon="edit"
                    label="Editar usuario"
                    (clicked)="openEdit(usuario)"
                  />
                  <app-dropdown-item
                    *appCan="'usuarios.cambiar_estado'"
                    [icon]="usuario.estado ? 'toggle_off' : 'toggle_on'"
                    [label]="usuario.estado ? 'Desactivar usuario' : 'Activar usuario'"
                    [danger]="usuario.estado"
                    (clicked)="confirmToggle(usuario)"
                  />
                </app-dropdown>
              </td>}
            </tr>
          }
      </tbody></app-table></app-list-shell>
    </div>

    <app-usuario-modal
      [open]="showModal()"
      [editing]="editingId() !== null"
      [canChangeState]="auth.can('usuarios.cambiar_estado')"
      [saving]="saving()"
      [data]="usuarioData()"
      [sucursales]="sucursales()"
      (saved)="onSaved($event)"
      (cancelled)="showModal.set(false)"
    />

    <app-usuario-asignaciones-modal
      [open]="showAsignaciones()"
      [usuarioNombre]="asignUsuario()?.nombre ?? ''"
      [roles]="roles()"
      [selected]="selectedAsignaciones()"
      [saving]="savingAsignaciones()"
      (saved)="onAsignacionesSaved($event)"
      (cancelled)="showAsignaciones.set(false)"
    />

    <app-confirmation-modal
      [open]="showConfirm()"
      [title]="(toggleTarget()?.estado ? 'Desactivar' : 'Activar') + ' usuario'"
      [message]="'Deseas ' + (toggleTarget()?.estado ? 'desactivar' : 'activar') + ' a ' + (toggleTarget()?.nombre ?? '') + '?'"
      [variant]="toggleTarget()?.estado ? 'danger' : 'primary'"
      [confirmLabel]="toggleTarget()?.estado ? 'Desactivar' : 'Activar'"
      (confirmed)="doToggle()"
      (cancelled)="showConfirm.set(false)"
    />
  `,
})
export class UsuariosComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly service = inject(UsuarioService);
  private readonly snackbar = inject(SnackbarService);

  readonly usuarios = signal<Usuario[]>([]);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly roles = signal<Rol[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly query = signal('');

  readonly showModal = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly usuarioData = signal<UsuarioFormData | null>(null);

  readonly showAsignaciones = signal(false);
  readonly savingAsignaciones = signal(false);
  readonly asignUsuario = signal<Usuario | null>(null);
  readonly selectedAsignaciones = signal<number[]>([]);

  readonly showConfirm = signal(false);
  readonly toggleTarget = signal<Usuario | null>(null);

  readonly activos = computed(() => this.usuarios().filter((usuario) => usuario.estado).length);

  readonly filteredUsuarios = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) {
      return this.usuarios();
    }
    return this.usuarios().filter((usuario) =>
      `${usuario.nombre} ${usuario.correo} ${usuario.sucursal?.nombre ?? ''}`.toLowerCase().includes(term),
    );
  });

  get showActions(): boolean { return ['usuarios.asignar_accesos', 'usuarios.editar', 'usuarios.cambiar_estado'].some(permission => this.auth.can(permission)); }

  ngOnInit(): void {
    this.load();
    if (this.auth.can('usuarios.crear') || this.auth.can('usuarios.editar')) this.service.sucursales().subscribe({
      next: (sucursales) => this.sucursales.set(sucursales),
      error: () => this.snackbar.error('No se pudieron cargar las sucursales.'),
    });
    if (this.auth.can('usuarios.asignar_accesos')) this.service.roles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.snackbar.error('No se pudieron cargar los roles.'),
    });
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.service.listar().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudo cargar la lista. Intenta nuevamente.');
        this.snackbar.error('No se pudo cargar la lista de usuarios.');
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.usuarioData.set(this.auth.currentUser()?.alcance_global ? null : {
      nombre: '', correo: '', estado: true,
      sucursal_id: this.auth.currentUser()?.sucursal?.id ?? null,
    });
    this.showModal.set(true);
  }

  openEdit(usuario: Usuario): void {
    this.editingId.set(usuario.id);
    this.usuarioData.set({
      nombre: usuario.nombre,
      correo: usuario.correo,
      sucursal_id: usuario.sucursal?.id ?? null,
      estado: usuario.estado,
    });
    this.showModal.set(true);
  }

  onSaved(payload: UsuarioPayload): void {
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
      error: (err) => {
        this.saving.set(false);
        this.snackbar.error(this.formatError(err));
      },
    });
  }

  openAsignaciones(usuario: Usuario): void {
    this.asignUsuario.set(usuario);
    this.selectedAsignaciones.set([]);
    this.service.getAsignaciones(usuario.id).subscribe({
      next: (response) => {
        this.selectedAsignaciones.set(response.data);
        this.showAsignaciones.set(true);
      },
      error: () => this.snackbar.error('No se pudieron cargar los accesos del usuario.'),
    });
  }

  onAsignacionesSaved(ids: number[]): void {
    const usuario = this.asignUsuario();
    if (!usuario) {
      return;
    }

    this.savingAsignaciones.set(true);
    this.service.syncAsignaciones(usuario.id, ids).subscribe({
      next: (response) => {
        this.savingAsignaciones.set(false);
        this.showAsignaciones.set(false);
        this.snackbar.success(response.message);
        this.load();
      },
      error: err => {
        this.savingAsignaciones.set(false);
        this.snackbar.error(apiError(err, 'No se pudieron guardar los accesos.'));
      },
    });
  }

  confirmToggle(usuario: Usuario): void {
    this.toggleTarget.set(usuario);
    this.showConfirm.set(true);
  }

  doToggle(): void {
    const usuario = this.toggleTarget();
    if (!usuario) {
      return;
    }

    this.showConfirm.set(false);
    this.service.cambiarEstado(usuario.id).subscribe({
      next: (response) => {
        this.snackbar.success(response.message);
        this.load();
      },
      error: err => this.snackbar.error(apiError(err, 'No se pudo cambiar el estado.')),
    });
  }

  initials(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  permisosResumen(usuario: Usuario): string {
    const total = usuario.roles_permisos?.length ?? 0;
    return total === 1 ? '1 acceso asignado' : `${total} accesos asignados`;
  }

  private formatError(err: any): string {
    return apiError(err, 'No se pudo guardar el usuario.');
  }
}
