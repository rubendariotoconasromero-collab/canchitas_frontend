import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../shared/components/list-toolbar/list-toolbar.component';
import { ListShellComponent } from '../../shared/components/list-shell/list-shell.component';
import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation, computed, inject, signal } from '@angular/core';

import { Rol, Sucursal, Usuario } from '../../core/models/auth.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { UsuarioAsignacionesModalComponent } from './components/usuario-asignaciones-modal.component';
import { UsuarioFormData, UsuarioModalComponent } from './components/usuario-modal.component';
import { UsuarioPayload, UsuarioService } from './usuario.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [PageHeaderComponent, ListToolbarComponent, ListShellComponent, 
    ButtonComponent,
    BadgeComponent,
    ConfirmationModalComponent,
    UsuarioModalComponent,
    UsuarioAsignacionesModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="main-content">
      <app-page-header title="Usuarios" icon="group">
        <app-button icon="add" (clicked)="openCreate()">Nuevo usuario</app-button>
      </app-page-header>

      <app-list-toolbar searchLabel="Buscar usuario" entity="usuarios"
        [total]="usuarios().length" [active]="activos()" [(query)]="query" />

      <app-list-shell class="usuarios-list" [loading]="loading()" [error]="loadError()"
        [empty]="filteredUsuarios().length === 0" (retry)="load()">
        <div class="list-header">
          <div class="list-col">ID</div>
          <div class="list-col">Nombre</div>
          <div class="list-col hide-sm">Correo</div>
          <div class="list-col hide-sm">Sucursal</div>
          <div class="list-col text-center">Estado</div>
          <div class="list-col text-center">Acciones</div>
        </div>

          @for (usuario of filteredUsuarios(); track usuario.id) {
            <div class="list-row">
              <div class="list-col list-col-id">#{{ usuario.id }}</div>
              <div class="list-col">
                <div class="user-cell">
                  <span class="avatar">{{ initials(usuario.nombre) }}</span>
                  <div>
                    <strong>{{ usuario.nombre }}</strong>
                    <small>{{ permisosResumen(usuario) }}</small>
                  </div>
                </div>
              </div>
              <div class="list-col hide-sm list-col-muted">{{ usuario.correo }}</div>
              <div class="list-col hide-sm">{{ usuario.sucursal?.nombre || 'Todas' }}</div>
              <div class="list-col center-col">
                <app-badge [active]="usuario.estado" />
              </div>
              <div class="list-col list-col-actions">
                <app-button
                  size="sm"
                  variant="outline-primary"
                  icon="admin_panel_settings"
                  title="Accesos"
                  (clicked)="openAsignaciones(usuario)"
                />
                <app-button
                  size="sm"
                  variant="outline-secondary"
                  icon="edit"
                  title="Editar"
                  (clicked)="openEdit(usuario)"
                />
                <app-button
                  size="sm"
                  [variant]="usuario.estado ? 'outline-danger' : 'outline-primary'"
                  [icon]="usuario.estado ? 'toggle_off' : 'toggle_on'"
                  [title]="usuario.estado ? 'Desactivar' : 'Activar'"
                  (clicked)="confirmToggle(usuario)"
                />
              </div>
            </div>
          }
      </app-list-shell>
    </div>

    <app-usuario-modal
      [open]="showModal()"
      [editing]="editingId() !== null"
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

  ngOnInit(): void {
    this.load();
    this.service.sucursales().subscribe({
      next: (sucursales) => this.sucursales.set(sucursales),
      error: () => this.snackbar.error('No se pudieron cargar las sucursales.'),
    });
    this.service.roles().subscribe({
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
    this.usuarioData.set(null);
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
      error: () => {
        this.savingAsignaciones.set(false);
        this.snackbar.error('No se pudieron guardar los accesos.');
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
      error: () => this.snackbar.error('No se pudo cambiar el estado.'),
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
    const data = err?.error;
    if (!data || typeof data === 'string') {
      return 'No se pudo guardar el usuario.';
    }
    const firstKey = Object.keys(data)[0];
    const firstValue = data[firstKey];
    return Array.isArray(firstValue) ? firstValue[0] : 'Revisa los datos ingresados.';
  }
}
