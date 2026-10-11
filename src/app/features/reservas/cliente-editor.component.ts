import { Component, effect, inject, input, output, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Branch, Cliente, ReservasService, apiError } from './reservas.service';
import { RESERVAS_UI } from './reservas-ui';

@Component({
  selector: 'app-cliente-editor', imports: [...RESERVAS_UI], styleUrl: './reservas.component.css',
  template: `
    <app-modal [open]="open()" [title]="client() ? 'Editar cliente' : 'Nuevo cliente'" icon="person" [busy]="saving()" (closed)="closed.emit()">
      <form #form="ngForm" (ngSubmit)="save()">
        <div class="modal-body operation-form">
          @if(error()) { <div class="alert alert-danger" role="alert">{{error()}}</div> }
          <app-select name="sucursal" label="Sucursal" [options]="branchOptions" [(ngModel)]="draft.sucursal" [disabled]="!!client() || fixedBranch()" [required]="true" />
          <app-input name="nombre" label="Nombre completo" [(ngModel)]="draft.nombre" [required]="true" />
          <div class="operation-grid"><app-input name="telefono" label="Telefono" type="tel" [(ngModel)]="draft.telefono" [required]="true" /><app-input name="documento" label="Documento" [(ngModel)]="draft.documento" /></div>
          <app-input name="correo" label="Correo" type="email" [(ngModel)]="draft.correo" />
          @if(client() && auth.can('clientes.desactivar')) { <app-checkbox name="activo" label="Cliente activo" [(ngModel)]="draft.activo" /> }
        </div>
        <div class="modal-footer"><app-button variant="outline-secondary" (clicked)="closed.emit()">Cancelar</app-button><app-button type="submit" icon="save" [disabled]="form.invalid || !draft.sucursal" [loading]="saving()">Guardar</app-button></div>
      </form>
    </app-modal>
  `,
})
export class ClienteEditorComponent {
  readonly auth = inject(AuthService);
  private readonly api = inject(ReservasService);
  readonly open = input(false);
  readonly client = input<Cliente | null>(null);
  readonly branches = input<Branch[]>([]);
  readonly branch = input('');
  readonly fixedBranch = input(false);
  readonly closed = output<void>();
  readonly saved = output<Cliente>();
  readonly saving = signal(false);
  readonly error = signal('');
  draft: Partial<Cliente> = {};
  get branchOptions() { return this.branches().map(x => ({value: String(x.id), label: x.nombre})); }
  constructor() {
    effect(() => {
      if(!this.open()) return;
      const client = this.client();
      this.draft = client ? {...client} : {sucursal: Number(this.branch()), nombre: '', telefono: '', correo: '', documento: '', activo: true};
      this.error.set('');
    });
  }
  save(): void {
    if(this.saving()) return;
    this.saving.set(true); this.error.set('');
    const {id, ...data} = this.draft;
    this.api.saveClient({...data, sucursal: Number(data.sucursal)}, this.client()?.id).subscribe({
      next: client => {this.saving.set(false); this.saved.emit(client);},
      error: error => {this.saving.set(false); this.error.set(apiError(error));},
    });
  }
}
