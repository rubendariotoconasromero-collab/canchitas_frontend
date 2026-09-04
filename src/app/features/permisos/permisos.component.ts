import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../shared/components/list-toolbar/list-toolbar.component';
import { ListShellComponent } from '../../shared/components/list-shell/list-shell.component';
import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { AccessFormModalComponent, AccessFormData } from '../access/components/access-form-modal.component';

import { Permiso } from '../../core/models/auth.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { PermisoPayload, PermisoService } from './permiso.service';

@Component({
  selector: 'app-permisos',
  standalone: true,
  imports: [PageHeaderComponent, ListToolbarComponent, ListShellComponent, AccessFormModalComponent, ButtonComponent, BadgeComponent, ConfirmationModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="main-content">
      <app-page-header title="Permisos" icon="rule">
        <app-button icon="add" (clicked)="openCreate()">Nuevo permiso</app-button>
      </app-page-header>

      <app-list-toolbar searchLabel="Buscar permiso" entity="permisos"
        [total]="permisos().length" [active]="activos()" [(query)]="query" />

      <app-list-shell class="permisos-list" [loading]="loading()" [error]="loadError()"
        [empty]="filteredPermisos().length === 0" (retry)="load()">
        <div class="list-header">
          <div class="list-col">ID</div>
          <div class="list-col">Nombre</div>
          <div class="list-col hide-sm">Descripcion</div>
          <div class="list-col text-center">Estado</div>
          <div class="list-col text-center">Acciones</div>
        </div>

          @for (permiso of filteredPermisos(); track permiso.id) {
            <div class="list-row">
              <div class="list-col list-col-id">#{{ permiso.id }}</div>
              <div class="list-col list-col-bold">{{ permiso.nombre }}</div>
              <div class="list-col hide-sm list-col-muted">{{ permiso.descripcion || 'Sin descripcion' }}</div>
              <div class="list-col center-col"><app-badge [active]="permiso.estado" /></div>
              <div class="list-col list-col-actions">
                <app-button size="sm" variant="outline-secondary" icon="edit" title="Editar" (clicked)="openEdit(permiso)" />
                <app-button
                  size="sm"
                  [variant]="permiso.estado ? 'outline-danger' : 'outline-primary'"
                  [icon]="permiso.estado ? 'toggle_off' : 'toggle_on'"
                  [title]="permiso.estado ? 'Desactivar' : 'Activar'"
                  (clicked)="confirmToggle(permiso)"
                />
              </div>
            </div>
          }
      </app-list-shell>
    </div>

    <app-access-form-modal entity="permiso" [open]="showModal()" [data]="formData()"
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
      error: () => {
        this.saving.set(false);
        this.snackbar.error('No se pudo guardar el permiso.');
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
      error: () => this.snackbar.error('No se pudo cambiar el estado.'),
    });
  }

  editing(): boolean {
    return this.editingId() !== null;
  }
}
