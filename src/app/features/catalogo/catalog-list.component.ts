import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
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

@Component({
  selector:'app-catalog-list',
  imports:[ReactiveFormsModule,RouterLink,PageHeaderComponent,ListShellComponent,ButtonComponent,
    ModalComponent,InputComponent,TextareaComponent,SelectComponent,CheckboxComponent,ConfirmationModalComponent],
  styleUrl:'./catalog.css',
  template:`
    <app-page-header [title]="config().title" [icon]="config().icon">
      @if (!config().singleton && allowed('crear') && canCreate()) { <app-button icon="add" (clicked)="edit()">{{config().endpoint === 'politicas' ? 'Configurar sucursal' : 'Agregar'}}</app-button> }
      @if (config().singleton && rows().length === 1 && allowed('editar')) { <app-button icon="edit" (clicked)="edit(rows()[0])">Editar configuracion</app-button> }
    </app-page-header>
    @if (!config().singleton) {
    <div class="catalog-toolbar">
      <app-input type="search" label="Buscar" [formControl]="search" />
      <span>{{filtered().length}} registros</span>
      <app-button variant="outline-secondary" icon="refresh" title="Actualizar" (clicked)="load()" />
    </div>
    }
    <app-list-shell [loading]="loading()" [error]="loadError()" [empty]="!filtered().length" (retry)="load()">
      @if (config().singleton) {
        @for (row of rows(); track row['id']) {
          <dl class="business-details">
            @for (field of config().fields; track field.key) {
              <div [class.wide]="field.type === 'textarea'"><dt>{{field.label}}</dt><dd>{{display(row,field.key)}}</dd></div>
            }
          </dl>
        }
      } @else if (config().endpoint === 'fotos') {
        <div class="photo-grid">
          @for (row of filtered(); track row['id']) {
            <figure><img [src]="row['archivo']" [alt]="row['texto_alternativo']" loading="lazy" />
              <figcaption><strong>{{row['texto_alternativo']}}</strong>
                <span>{{row['publicada'] ? 'Publicada' : 'Oculta'}} · {{row['orden']}}</span>
                @if (allowed('editar')) { <app-button icon="edit" title="Editar foto" variant="outline-secondary" (clicked)="edit(row)" /> }
                @if (allowed('desactivar') && row['publicada']) { <app-button icon="visibility_off" title="Ocultar foto" variant="outline-danger" (clicked)="removeTarget.set(row)" /> }
              </figcaption>
            </figure>
          }
        </div>
      } @else {
        <div class="catalog-table-wrap"><table class="table catalog-table">
          <thead><tr>@for (column of config().columns; track column.key) {<th>{{column.label}}</th>}<th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>@for (row of filtered(); track row['id']) {
            <tr>@for (column of config().columns; track column.key) {<td>{{display(row,column.key)}}</td>}
              <td><span class="catalog-status" [class.off]="!row[config().state || 'activo']">{{row[config().state || 'activo'] ? 'Activo' : 'Inactivo'}}</span></td>
              <td><div class="catalog-actions">
                @if (config().endpoint === 'canchas') {<a class="btn btn-outline-primary btn-sm" [routerLink]="['/canchas',row['id']]" title="Abrir cancha"><span class="material-symbols-outlined">open_in_new</span></a>}
                @if (config().versioned ? allowed('crear') : allowed('editar')) {
                  <app-button size="sm" variant="outline-secondary" [icon]="config().versioned ? 'content_copy' : 'edit'" [title]="config().versioned ? 'Nueva version basada en esta' : 'Editar'" (clicked)="edit(row)" />
                }
                @if (config().endpoint !== 'politicas' && !config().versioned && allowed('desactivar') && row[config().state || 'activo']) {
                  <app-button size="sm" variant="outline-danger" icon="toggle_off" title="Desactivar" (clicked)="removeTarget.set(row)" />
                }
              </div></td>
            </tr>
          }</tbody>
        </table></div>
      }
    </app-list-shell>
    @if (opened()) {
    <app-modal [open]="opened()" [title]="(editingId() ? 'Editar: ' : 'Nuevo: ') + config().title" size="wide" [busy]="saving()" (closed)="opened.set(false)">
      <form [formGroup]="form" (ngSubmit)="save()" [attr.data-catalog]="config().endpoint" novalidate>
        <div class="modal-body">
          @if (error()) {<div class="alert alert-danger" role="alert">{{error()}}</div>}
          <div class="catalog-form-grid">
            @for (field of config().fields; track field.key) {
              @if (fixed()[field.key] === undefined) {
                @if (field.sectionBefore) {
                  <div class="catalog-form-section"><span>{{field.sectionBefore}}</span></div>
                }
                <div class="catalog-form-field" [class.wide]="field.type === 'textarea' || field.type === 'file'" [class.checkbox-option]="field.type === 'checkbox'">
                  @switch (field.type) {
                    @case ('checkbox') {<app-checkbox [label]="field.label" [formControlName]="field.key" />}
                    @case ('textarea') {<app-textarea [label]="field.label" [formControlName]="field.key" />}
                    @case ('select') {<app-select [label]="field.label" [formControlName]="field.key" placeholder="Seleccionar" [options]="options()[field.key] || field.options || []" [required]="!!field.required" />}
                    @case ('file') {<label class="form-label" for="catalog-image">{{field.label}}</label><input id="catalog-image" type="file" class="form-control" accept="image/jpeg,image/png,image/webp" (change)="fileChanged($event)" />}
                    @default {<app-input [label]="field.label" [type]="inputType(field)" [formControlName]="field.key" [required]="!!field.required" />}
                  }
                  @if (form.get(field.key)?.touched && form.get(field.key)?.invalid) {<small class="text-danger">Revisa este valor.</small>}
                </div>
              }
            }
          </div>
        </div>
        <div class="modal-footer"><app-button variant="outline-secondary" [disabled]="saving()" (clicked)="opened.set(false)">Cancelar</app-button>
          <app-button type="submit" icon="save" [loading]="saving()">Guardar</app-button></div>
      </form>
    </app-modal>
    }
    <app-confirmation-modal [open]="!!removeTarget()" title="Desactivar registro" message="El registro dejara de estar activo. Se conservara su historial." confirmLabel="Desactivar" variant="danger" (confirmed)="deactivate()" (cancelled)="removeTarget.set(null)" />
  `,
})
export class CatalogListComponent {
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
  readonly editingId = signal<number | undefined>(undefined);
  readonly removeTarget = signal<CatalogRow | null>(null);
  readonly query = signal('');
  readonly search = new FormControl('',{nonNullable:true});
  form = new FormGroup<Record<string,FormControl>>({});
  private file: File | null = null;
  readonly filtered = computed(() => this.rows().filter(row => JSON.stringify(row).toLowerCase().includes(this.query().toLowerCase())));

  constructor() {
    this.search.valueChanges.subscribe(value => this.query.set(value));
    effect(() => { this.config(); this.fixed(); this.load(); this.loadOptions(); });
  }
  allowed(action: string) { return this.auth.can(this.config().permission + '.' + action, !!this.config().global); }
  canCreate() {
    if (this.config().endpoint !== 'politicas') return true;
    if (this.loading()) return false;
    if (this.fixed()['sucursal']) return !this.rows().length;
    return (this.options()['sucursal'] || []).some(option => !this.rows().some(row => String(row['sucursal']) === option.value));
  }
  inputType(field: Field) { return (field.type || 'text') as InputType; }
  display(row: CatalogRow, key: string): string {
    const value = row[key];
    if (value === null || value === undefined || value === '') return 'Pendiente';
    if (typeof value === 'boolean') return value ? 'Si' : 'No';
    if (key === 'dia_semana') return ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'][Number(value)-1];
    const choice = this.options()[key]?.find(item => item.value === String(value));
    return choice?.label || String(value);
  }
  load() {
    this.loading.set(true); this.loadError.set('');
    this.service.list(this.config().endpoint,this.fixed()).subscribe({next: rows => {this.rows.set(rows);this.loading.set(false);},
      error: err => {this.loading.set(false);this.loadError.set(this.errorText(err));}});
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
    this.form = new FormGroup(controls); this.opened.set(true);
  }
  fileChanged(event: Event) {
    this.file = (event.target as HTMLInputElement).files?.[0] || null;
    this.form.get('archivo')?.setValue(this.file?.name || '');
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
      this.saving.set(false);this.opened.set(false);this.load();this.changed.emit();
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
