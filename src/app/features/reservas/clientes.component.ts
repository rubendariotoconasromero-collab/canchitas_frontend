import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ReservasService, Cliente, Branch, apiError } from './reservas.service';
import { RESERVAS_UI } from './reservas-ui';
import { ClienteEditorComponent } from './cliente-editor.component';

import { DropdownComponent, DropdownItemComponent } from '../../shared/components/dropdown';

@Component({selector: 'app-clientes', imports: [...RESERVAS_UI, ClienteEditorComponent, DropdownComponent, DropdownItemComponent], styleUrl: './reservas.component.css', template: `
  <div class="main-content">
    <app-page-header title="Clientes" icon="contact_phone">
      @if(auth.can('clientes.crear')) { <app-button icon="person_add" (clicked)="edit()">Nuevo cliente</app-button> }
    </app-page-header>
    <app-list-toolbar label="Filtros de clientes" searchLabel="Buscar cliente" searchPlaceholder="Nombre, telefono o documento"
      [query]="search" (queryChange)="search=$event;load()" [total]="rows().length" [loading]="loading()" [showRefresh]="true" refreshLabel="Actualizar clientes" (refreshed)="load()">
      <div toolbar-filter>
      @if(branches.length>1){
        <app-select label="Sucursal" [options]="branchOptions" [(ngModel)]="branch" (ngModelChange)="load()" />
      }@else{
        <app-filter-context label="Sucursal" [value]="selectedBranchName || 'Sin sucursal disponible'" />
      }
      </div>
    </app-list-toolbar>
    <app-list-shell [loading]="loading()" [error]="error()" [empty]="!rows().length" (retry)="load()">
      <table class="table align-middle mb-0"><thead><tr><th>Cliente</th><th>Telefono</th><th>Correo</th><th>Documento</th><th>Estado</th><th class="text-center">Acciones</th></tr></thead>
      <tbody>@for(row of rows(); track row.id) { <tr><td><strong>{{row.nombre}}</strong></td><td>{{row.telefono}}</td><td>{{row.correo || '-'}}</td><td>{{row.documento || '-'}}</td><td><app-badge [active]="row.activo" /></td>
      <td class="text-center">@if(auth.can('clientes.editar')) {
        <app-dropdown align="end" [title]="'Acciones para ' + row.nombre">
          <app-dropdown-item icon="edit" label="Editar cliente" (clicked)="edit(row)" />
        </app-dropdown>
      }</td></tr> }</tbody></table>
    </app-list-shell>
  </div>
  <app-cliente-editor [open]="open()" [client]="editing()" [branches]="branches" [branch]="branch" (closed)="open.set(false)" (saved)="open.set(false);load()" />
`})
export class ClientesComponent {
  readonly auth = inject(AuthService); private readonly api = inject(ReservasService);
  private readonly route = inject(ActivatedRoute);
  readonly rows = signal<Cliente[]>([]); readonly loading = signal(false); readonly error = signal('');
  readonly open = signal(false); readonly editing = signal<Cliente | null>(null);
  branches: Branch[] = []; branch = ''; search = '';
  private sequence = 0;
  get branchOptions() { return this.branches.map(x => ({value: String(x.id), label: x.nombre})); }
  get selectedBranchName() { return this.branches.find(x => String(x.id) === this.branch)?.nombre ?? ''; }
  constructor() { this.api.branches().subscribe({next: rows => {
    this.branches = rows;
    const selected=rows.find(b=>String(b.id)===this.route.snapshot.queryParamMap.get('sucursal'));
    this.branch = String((selected??rows[0])?.id ?? ''); this.load();
  }, error: e => this.error.set(apiError(e))}); }
  load() {
    if (!this.branch) return;
    const sequence = ++this.sequence; this.loading.set(true); this.error.set('');
    this.api.clients(this.branch, this.search).subscribe({next: rows => {if (sequence === this.sequence) {this.rows.set(rows); this.loading.set(false);}}, error: e => {if (sequence === this.sequence) {this.error.set(apiError(e)); this.loading.set(false);}}});
  }
  edit(row?: Cliente) { this.editing.set(row || null); this.open.set(true); }
}
