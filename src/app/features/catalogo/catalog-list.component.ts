import { Component, computed, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogConfig, CatalogRow, Field } from './catalog.config';
import { CatalogService } from './catalog.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ListShellComponent } from '../../shared/components/list-shell/list-shell.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { InputComponent, InputType } from '../../shared/components/input/input.component';
import { TextareaComponent } from '../../shared/components/textarea/textarea.component';
import { SelectComponent, SelectOption } from '../../shared/components/select/select.component';
import { CheckboxComponent } from '../../shared/components/checkbox/checkbox.component';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';
import { ReservationConditionsComponent } from './reservation-conditions.component';
import { dimensionsValidator, formatArea, formatDimensions } from './court-dimensions';
import { BusinessProfileComponent } from './business-profile.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ListToolbarComponent } from '../../shared/components/list-toolbar/list-toolbar.component';

import { DropdownComponent, DropdownItemComponent } from '../../shared/components/dropdown';

@Component({
  selector:'app-catalog-list',
  imports:[ReactiveFormsModule,RouterLink,PageHeaderComponent,ListShellComponent,ButtonComponent,BadgeComponent,ListToolbarComponent,
    ModalComponent,InputComponent,TextareaComponent,SelectComponent,CheckboxComponent,ConfirmationModalComponent,ReservationConditionsComponent,BusinessProfileComponent,DropdownComponent,DropdownItemComponent],
  styleUrls:['./catalog.css','./court-dimensions.css','./photo-preview.css'],
  template:`
    <app-page-header [title]="config().title" [icon]="config().icon" [showBack]="showBack()">
      @if (!config().singleton && allowed('crear') && canCreate()) { <app-button icon="add" (clicked)="edit()">{{config().endpoint === 'politicas' ? 'Configurar sucursal' : 'Agregar'}}</app-button> }
      @if (config().singleton && rows().length === 1 && allowed('editar')) { <app-button icon="edit" (clicked)="edit(rows()[0])">Editar configuracion</app-button> }
    </app-page-header>
    @if (!config().singleton) {
    <app-list-toolbar [query]="search.value" (queryChange)="search.setValue($event)" [total]="filtered().length" [loading]="loading()" [showRefresh]="true" (refreshed)="load()" />
    }
    @if (photoOrderError()) {<div class="alert alert-danger" role="alert">{{photoOrderError()}}</div>}
    <app-list-shell [class.business-shell]="config().singleton" [loading]="loading()" [error]="loadError()" [empty]="!filtered().length" (retry)="load()">
      @if (config().singleton) {
        @for (row of rows(); track row['id']) {
          <app-business-profile [business]="row" />
        }
      } @else if (config().endpoint === 'fotos') {
        <div class="photo-grid">
          @for (row of filtered(); track row['id']) {
            <figure><img [src]="row['archivo']" [alt]="row['texto_alternativo']" loading="lazy" />
              <figcaption><strong>{{row['texto_alternativo']}}</strong>
                <app-badge [active]="!!row['publicada']" activeLabel="Publicada" inactiveLabel="Oculta" [icon]="row['publicada'] ? 'public' : 'visibility_off'" /><span>Posicion {{photoPosition(row) + 1}}</span>
                @if (allowed('editar')) {
                  <app-button size="sm" variant="outline-secondary" title="Subir foto" [disabled]="movingPhoto() || loading() || photoPosition(row) === 0" (clicked)="movePhoto(row, 'subir')"><span class="material-symbols-outlined photo-arrow-up" aria-hidden="true">arrow_forward</span></app-button>
                  <app-button size="sm" variant="outline-secondary" title="Bajar foto" [disabled]="movingPhoto() || loading() || photoPosition(row) === rows().length - 1" (clicked)="movePhoto(row, 'bajar')"><span class="material-symbols-outlined photo-arrow-down" aria-hidden="true">arrow_forward</span></app-button>
                }
                @if (allowed('editar')) { <app-button icon="edit" title="Editar foto" variant="outline-secondary" (clicked)="edit(row)" /> }
                @if (allowed('desactivar') && row['publicada']) { <app-button icon="visibility_off" title="Ocultar foto" variant="outline-danger" (clicked)="removeTarget.set(row)" /> }
              </figcaption>
            </figure>
          }
        </div>
      } @else {
        <div class="catalog-table-wrap"><table class="table catalog-table">
          <thead><tr>@for (column of config().columns; track column.key) {<th>{{column.label}}</th>}<th>Estado</th>@if(showActions()){<th>Acciones</th>}</tr></thead>
          <tbody>@for (row of filtered(); track row['id']) {
            <tr>@for (column of config().columns; track column.key) {<td>{{display(row,column.key)}}</td>}
              <td><app-badge [active]="!!row[config().state || 'activo']" /></td>
              @if(showActions()){<td>@if(hasActions(row)){<div class="catalog-actions">
                <app-dropdown align="end" title="Acciones">
                  @if (config().endpoint === 'canchas') {
                    <a [routerLink]="['/canchas', row['id']]" class="dropdown-item-btn" role="menuitem">
                      <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
                      <span>Ver cancha</span>
                    </a>
                  }
                  @if (config().versioned ? allowed('crear') : allowed('editar')) {
                    <app-dropdown-item
                      [icon]="config().versioned ? 'content_copy' : 'edit'"
                      [label]="config().versioned ? 'Nueva version' : 'Editar'"
                      (clicked)="edit(row)"
                    />
                  }
                  @if (config().endpoint !== 'politicas' && !config().versioned && allowed('desactivar') && row[config().state || 'activo']) {
                    <app-dropdown-item
                      icon="toggle_off"
                      label="Desactivar"
                      [danger]="true"
                      (clicked)="removeTarget.set(row)"
                    />
                  }
                </app-dropdown>
              </div>}</td>}
            </tr>
          }</tbody>
        </table></div>
      }
    </app-list-shell>
    @if (opened()) {
    <app-modal [open]="opened()" [title]="(editingId() ? 'Editar: ' : 'Nuevo: ') + config().title" size="wide" [busy]="saving()" (closed)="closeModal()">
      <form [formGroup]="form" (ngSubmit)="save()" [attr.data-catalog]="config().endpoint" novalidate>
        <div class="modal-body">
          @if (config().endpoint === 'politicas') { <app-reservation-conditions /> }
          @if (error()) {<div class="alert alert-danger" role="alert">{{error()}}</div>}
          <div class="catalog-form-grid">
            @for (field of config().fields; track field.key) {
              @if (fixed()[field.key] === undefined) {
                @if (field.sectionBefore) {
                  <div class="catalog-form-section"><span>{{field.sectionBefore}}</span></div>
                }
                <div class="catalog-form-field" [class.wide]="field.wide || field.type === 'textarea' || field.type === 'file'" [class.checkbox-option]="field.type === 'checkbox'">
                  @switch (field.type) {
                    @case ('checkbox') {<app-checkbox [label]="field.label" [formControlName]="field.key" />}
                    @case ('textarea') {<app-textarea [label]="field.label" [formControlName]="field.key" />}
                    @case ('select') {<app-select [label]="field.label" [formControlName]="field.key" placeholder="Seleccionar" [options]="fieldOptions(field)" [required]="!!field.required" />}
                    @case ('file') {
                      <label class="form-label" for="catalog-image">{{field.label}}</label>
                      <input id="catalog-image" type="file" class="form-control" accept="image/jpeg,image/png,image/webp" [disabled]="saving()" (change)="fileChanged($event)" />
                      @if (photoPreviewError()) {<small class="text-danger d-block mt-2" role="alert">{{photoPreviewError()}}</small>}
                      @if (photoPreview(); as preview) {
                        <figure class="photo-preview">
                          @if (!photoPreviewFailed()) {
                            <img [src]="preview" [alt]="form.get('texto_alternativo')?.value || 'Vista previa de la fotografia'" (error)="photoPreviewFailed.set(true)" />
                          } @else {<p role="status">No se pudo mostrar la vista previa de esta imagen.</p>}
                          <figcaption>Vista previa</figcaption>
                        </figure>
                      }
                    }
                    @default {<app-input [label]="field.label" [type]="inputType(field)" [formControlName]="field.key" [required]="!!field.required" [step]="field.step ?? null" [min]="field.min ?? null" [max]="field.max ?? null" />}
                  }
                  @if (form.get(field.key)?.touched && form.get(field.key)?.invalid) {<small class="text-danger">Revisa este valor.</small>}
                </div>
                @if (config().endpoint === 'canchas' && field.key === 'largo_metros') {
                  <div class="court-area wide" aria-live="polite">
                    <span>Area de juego</span><strong>{{ areaPreview() }}</strong>
                    @if (form.errors?.['dimensions'] && (form.touched || form.dirty)) {
                      <small class="text-danger" role="alert">{{ form.errors?.['dimensions'] }}</small>
                    }
                  </div>
                }
              }
            }
          </div>
        </div>
        <div class="modal-footer"><app-button variant="outline-secondary" [disabled]="saving()" (clicked)="closeModal()">Cancelar</app-button>
          <app-button type="submit" icon="save" [loading]="saving()">Guardar</app-button></div>
      </form>
    </app-modal>
    }
    <app-confirmation-modal [open]="!!removeTarget()" title="Desactivar registro" message="El registro dejara de estar activo. Se conservara su historial." confirmLabel="Desactivar" variant="danger" (confirmed)="deactivate()" (cancelled)="removeTarget.set(null)" />
  `,
})
export class CatalogListComponent {
  readonly showBack = input(true);
  readonly config = input.required<CatalogConfig>();
  readonly fixed = input<Record<string, any>>({});
  readonly changed = output<void>();
  private readonly service = inject(CatalogService);
  private readonly auth = inject(AuthService);
  readonly rows = signal<CatalogRow[]>([]);
  readonly options = signal<Record<string, SelectOption[]>>({});
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly opened = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly movingPhoto = signal(false);
  readonly photoOrderError = signal('');
  readonly photoPreview = signal('');
  readonly photoPreviewError = signal('');
  readonly photoPreviewFailed = signal(false);
  readonly editingId = signal<number | undefined>(undefined);
  readonly removeTarget = signal<CatalogRow | null>(null);
  readonly query = signal('');
  readonly search = new FormControl('',{nonNullable:true});
  form = new FormGroup<Record<string,FormControl>>({});
  private file: File | null = null;
  private previewUrl: string | null = null;
  private originalPhoto = '';
  readonly filtered = computed(() => this.rows().filter(row => JSON.stringify(row).toLowerCase().includes(this.query().trim().toLowerCase())));
  readonly showActions = computed(() => this.filtered().some(row => this.hasActions(row)));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releasePreview());
    this.search.valueChanges.subscribe(value => this.query.set(value));
    effect(() => {
      this.config(); this.fixed();
      untracked(() => { this.load(); this.loadOptions(); });
    });
  }
  allowed(action: string) { return this.auth.can(this.config().permission + '.' + action, !!this.config().global); }
  hasActions(row: CatalogRow): boolean {
    const config = this.config();
    return config.endpoint === 'canchas'
      || (config.versioned ? this.allowed('crear') : this.allowed('editar'))
      || (config.endpoint !== 'politicas' && !config.versioned && this.allowed('desactivar') && !!row[config.state || 'activo']);
  }
  canCreate() {
    if (this.config().endpoint !== 'politicas') return true;
    if (this.loading()) return false;
    if (this.fixed()['sucursal']) return !this.rows().length;
    return (this.options()['sucursal'] || []).some(option => !this.rows().some(row => String(row['sucursal']) === option.value));
  }
  inputType(field: Field) { return (field.type || 'text') as InputType; }
  fieldOptions(field: Field): SelectOption[] {
    const options = this.options()[field.key] || field.options || [];
    const value = this.form.get(field.key)?.value;
    // Preserve earlier free-text surfaces while editing existing courts.
    if (this.config().endpoint === 'canchas' && field.key === 'superficie' && value &&
        !options.some(option => option.value === String(value))) {
      return [...options, { value: String(value), label: String(value) }];
    }
    return options;
  }
  display(row: CatalogRow, key: string): string {
    if (this.config().endpoint === 'politicas') {
      if (key === 'regla_pago') return '100 % del importe';
      if (key === 'regla_reembolso') return 'Sin reembolso';
    }
    if (key === 'dimensiones') return formatDimensions(row['ancho_metros'], row['largo_metros']);
    const value = row[key];
    if (value === null || value === undefined || value === '') return 'Pendiente';
    if (typeof value === 'boolean') return value ? 'Si' : 'No';
    if (key === 'dia_semana') return ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'][Number(value)-1];
    const choices = this.options()[key] || this.config().fields.find(field => field.key === key)?.options;
    const choice = choices?.find(item => item.value === String(value));
    return choice?.label || String(value);
  }
  load() {
    this.loading.set(true); this.loadError.set('');
    this.service.list(this.config().endpoint,this.fixed()).subscribe({next: rows => {this.rows.set(rows);this.loading.set(false);},
      error: err => {this.loading.set(false);this.loadError.set(this.errorText(err));}});
  }
  photoPosition(row: CatalogRow) { return this.rows().findIndex(item => item['id'] === row['id']); }
  movePhoto(row: CatalogRow, direction: 'subir' | 'bajar') {
    if (this.movingPhoto() || this.loading() || !this.allowed('editar')) return;
    const index = this.photoPosition(row);
    if (index < 0 || (direction === 'subir' ? index === 0 : index === this.rows().length - 1)) return;
    this.movingPhoto.set(true); this.photoOrderError.set('');
    this.service.movePhoto(row['id'], direction).subscribe({next: () => {
      this.movingPhoto.set(false); this.load(); this.changed.emit();
    }, error: err => {this.movingPhoto.set(false); this.photoOrderError.set(this.errorText(err));}});
  }
  loadOptions() {
    this.options.set({});
    for (const field of this.config().fields) {
      if (!field.lookup || this.fixed()[field.key] !== undefined) continue;
      const permission = field.lookup === 'negocios' ? 'negocio' : field.lookup === 'cancha-deportes' ? 'canchas' : field.lookup;
      if (!this.auth.can(permission + '.ver', field.lookup === 'negocios')) continue;
      const filter = field.lookup === 'cancha-deportes' ? this.fixed() : {};
      this.service.list(field.lookup,filter).subscribe({next: rows => this.options.update(options => ({...options,
        [field.key]: rows.map(row => ({value:String(row['id']),label:String(row[field.labelKey || 'nombre'])}))})),
        error: err => this.loadError.set(this.errorText(err))});
    }
  }
  edit(row?: CatalogRow) {
    if (this.config().singleton && !row?.['id']) return;
    if (this.config().endpoint === 'politicas' && !row && !this.canCreate()) return;
    this.editingId.set(this.config().versioned ? undefined : row?.['id']);
    this.file = null; this.error.set('');
    this.releasePreview();
    this.originalPhoto = this.config().endpoint === 'fotos' ? row?.['archivo'] || '' : '';
    this.photoPreview.set(this.originalPhoto);
    this.photoPreviewError.set(''); this.photoPreviewFailed.set(false);
    const controls: Record<string,FormControl> = {};
    for (const field of this.config().fields) {
      const rules = [];
      if (field.required && !(field.type === 'file' && row)) rules.push(Validators.required);
      if (field.min !== undefined) rules.push(Validators.min(field.min));
      if (field.max !== undefined) rules.push(Validators.max(field.max));
      const value = this.fixed()[field.key] ?? row?.[field.key] ?? field.initial ?? '';
      controls[field.key] = new FormControl(field.type === 'select' ? String(value) : value,rules);
      if (row && this.config().endpoint === 'politicas' && field.key === 'sucursal') controls[field.key].disable();
      if (row && field.key === this.config().state && row[field.key] && !this.allowed('desactivar')) controls[field.key].disable();
    }
    this.form = new FormGroup(controls, this.config().endpoint === 'canchas' ? dimensionsValidator : null);
    this.opened.set(true);
  }
  areaPreview(): string {
    const width = this.form.get('ancho_metros')?.value;
    const length = this.form.get('largo_metros')?.value;
    if (this.form.errors?.['dimensions'] || width === '' || length === '' || width == null || length == null) return 'Sin registrar';
    return formatArea(Number(width) * Number(length));
  }
  fileChanged(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    this.releasePreview();
    this.file = null;
    this.photoPreview.set(this.originalPhoto);
    this.photoPreviewFailed.set(false); this.photoPreviewError.set('');
    const control = this.form.get('archivo');
    control?.setValue(this.originalPhoto);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.photoPreviewError.set(file.size > 5 * 1024 * 1024 ? 'La imagen no puede superar 5 MB.' : 'Usa una imagen JPEG, PNG o WebP.');
      control?.setErrors({invalidImage: true}); control?.markAsTouched();
      return;
    }
    this.file = file;
    control?.setValue(file.name);
    this.previewUrl = URL.createObjectURL(file);
    this.photoPreview.set(this.previewUrl);
  }
  private releasePreview() {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
  }
  closeModal() {
    if (this.saving()) return;
    this.opened.set(false); this.releasePreview();
    this.file = null; this.originalPhoto = ''; this.photoPreview.set('');
    this.photoPreviewError.set(''); this.photoPreviewFailed.set(false);
  }
  save() {
    if (this.config().singleton && !this.editingId()) return;
    if (this.saving()) return;
    if (this.form.invalid) {this.form.markAllAsTouched(); return;}
    const data: CatalogRow = {...this.fixed()};
    for (const field of this.config().fields) {
      if (field.type === 'file') continue;
      let value = this.form.get(field.key)?.value;
      if (value === '' && field.nullable) value = null;
      else if ((field.type === 'number' || field.lookup || field.key === 'dia_semana') && value !== '') value = Number(value);
      data[field.key] = value;
    }
    let payload: CatalogRow | FormData = data;
    if (this.file) {
      const multipart = new FormData();
      Object.entries(data).forEach(([key,value]) => {if (value !== null) multipart.append(key,String(value));});
      multipart.append('archivo',this.file); payload = multipart;
    }
    this.saving.set(true); this.error.set('');
    this.service.save(this.config().endpoint,payload,this.editingId()).subscribe({next: () => {
      this.saving.set(false);this.closeModal();this.load();this.changed.emit();
    },error: err => {this.saving.set(false);this.error.set(this.errorText(err));}});
  }
  deactivate() {
    const row = this.removeTarget(); if (!row) return;
    this.removeTarget.set(null);
    this.service.deactivate(this.config().endpoint,row['id']).subscribe({next: () => {this.load();this.changed.emit();},
      error: err => this.loadError.set(this.errorText(err))});
  }
  private errorText(err: any): string {
    if (typeof err?.error === 'object') return Object.entries(err.error).map(([key,value]) => `${key}: ${Array.isArray(value) ? value.join(' ') : value}`).join(' ');
    return 'No se pudo completar la operacion. Comprueba la conexion e intenta nuevamente.';
  }
}
