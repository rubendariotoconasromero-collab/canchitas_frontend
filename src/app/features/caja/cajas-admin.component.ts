import { Component, computed, inject, signal } from '@angular/core';
import { RESERVAS_UI } from '../reservas/reservas-ui';
import { apiError } from '../reservas/reservas.service';
import { CajaService, CashBox } from './caja.service';
import { DropdownComponent, DropdownItemComponent } from '../../shared/components/dropdown';

@Component({
  selector: 'app-cajas-admin',
  imports: [...RESERVAS_UI, DropdownComponent, DropdownItemComponent],
  template: `
    <div class="main-content">
      <app-page-header title="Administracion de cajas" icon="payments" backRoute="/caja" />
      <app-list-toolbar searchLabel="Buscar caja" searchPlaceholder="Nombre o sucursal"
        [(query)]="query" [total]="filtered().length" [loading]="loading()" [showRefresh]="true" (refreshed)="load()">
        <app-select toolbar-filter label="Estado" placeholder="Todos" [options]="stateOptions" [(ngModel)]="state" />
      </app-list-toolbar>
      @if(error()){<div class="alert alert-danger" role="alert">{{error()}}</div>}
      <app-list-shell [loading]="loading()" [error]="loadError()" [empty]="!filtered().length" (retry)="load()">
        <table class="table align-middle mb-0">
          <thead><tr><th>Caja</th><th>Sucursal</th><th>Estado</th><th>Turno</th><th class="text-center">Acciones</th></tr></thead>
          <tbody>@for(box of filtered();track box.id){
            <tr><td>{{box.nombre}}</td><td>{{box.sucursal_nombre}}</td>
              <td><app-badge [active]="box.activa" /></td>
              <td><app-badge [label]="box.sesion_actual ? 'Turno abierto' : 'Sin turno abierto'" [tone]="box.sesion_actual ? 'success' : 'neutral'" /></td>
              <td class="text-center"><app-dropdown align="end" [title]="'Acciones para ' + box.nombre">
                <app-dropdown-item icon="edit" label="Editar nombre" [disabled]="saving()" (clicked)="edit(box)" />
                <app-dropdown-item [icon]="box.activa ? 'toggle_off' : 'toggle_on'" [label]="box.activa ? 'Desactivar' : 'Activar'"
                  [danger]="box.activa" [disabled]="saving() || (box.activa && !!box.sesion_actual)"
                  [title]="box.activa && box.sesion_actual ? 'Cierra el turno antes de desactivar la caja' : ''" (clicked)="askToggle(box)" />
              </app-dropdown></td>
            </tr>
          }</tbody>
        </table>
      </app-list-shell>
    </div>
    <app-modal [open]="!!editing()" title="Editar nombre de caja" icon="edit" [busy]="saving()" (closed)="editing.set(null)">
      <form #form="ngForm" (ngSubmit)="saveName()">
        <div class="modal-body">
          @if(formError()){<div class="alert alert-danger" role="alert">{{formError()}}</div>}
          <app-input name="nombre" label="Nombre de caja" [(ngModel)]="name" [required]="true" />
        </div>
        <div class="modal-footer"><app-button variant="outline-secondary" [disabled]="saving()" (clicked)="editing.set(null)">Cancelar</app-button>
          <app-button type="submit" icon="save" [loading]="saving()" [disabled]="form.invalid || !name.trim() || name.trim().length>100">Guardar</app-button></div>
      </form>
    </app-modal>
    <app-modal [open]="!!toggleTarget()" [title]="toggleTarget()?.activa ? 'Desactivar caja' : 'Activar caja'" icon="help" [busy]="saving()" (closed)="toggleTarget.set(null)">
      <div class="modal-body"><p>{{toggleTarget()?.activa ? 'Desactivar' : 'Activar'}} la caja {{toggleTarget()?.nombre}}?</p>
        @if(formError()){<div class="alert alert-danger" role="alert">{{formError()}}</div>}
      </div>
      <div class="modal-footer"><app-button variant="outline-secondary" [disabled]="saving()" (clicked)="toggleTarget.set(null)">Cancelar</app-button>
        <app-button [variant]="toggleTarget()?.activa ? 'danger' : 'primary'" [loading]="saving()" (clicked)="toggle()">Confirmar</app-button></div>
    </app-modal>
  `,
})
export class CajasAdminComponent {
  private readonly api=inject(CajaService);
  readonly rows=signal<CashBox[]>([]);
  readonly loading=signal(false); readonly saving=signal(false);
  readonly loadError=signal(''); readonly error=signal(''); readonly formError=signal('');
  readonly query=signal(''); readonly state=signal('');
  readonly editing=signal<CashBox|null>(null); readonly toggleTarget=signal<CashBox|null>(null);
  readonly stateOptions=[{value:'active',label:'Activas'},{value:'inactive',label:'Inactivas'}];
  name='';
  readonly filtered=computed(() => {
    const term=this.query().trim().toLowerCase(), state=this.state();
    return this.rows().filter(box=>(!state || box.activa===(state==='active')) &&
      (box.nombre+' '+box.sucursal_nombre).toLowerCase().includes(term));
  });
  constructor(){this.load();}
  load(){this.loading.set(true);this.loadError.set('');this.api.boxes().subscribe({
    next:rows=>{this.rows.set(rows);this.loading.set(false);},
    error:e=>{this.loadError.set(apiError(e));this.loading.set(false);},
  });}
  edit(box:CashBox){if(this.saving())return;this.formError.set('');this.name=box.nombre;this.editing.set(box);}
  askToggle(box:CashBox){
    if(this.saving())return;
    this.error.set('');
    if(box.activa && box.sesion_actual){this.error.set('Cierra el turno antes de desactivar la caja.');return;}
    this.formError.set('');this.toggleTarget.set(box);
  }
  saveName(){const box=this.editing(), name=this.name.trim();if(!box || !name || name.length>100 || this.saving())return;this.update(box,{nombre:name});}
  toggle(){const box=this.toggleTarget();if(!box || this.saving())return;if(box.activa && box.sesion_actual)return;this.update(box,{activa:!box.activa});}
  private update(box:CashBox,data:{nombre?:string;activa?:boolean}){
    this.saving.set(true);this.formError.set('');
    this.api.updateBox(box.id,data).subscribe({
      next:()=>{this.saving.set(false);this.editing.set(null);this.toggleTarget.set(null);this.error.set('');this.load();},
      error:e=>{this.saving.set(false);this.formError.set(apiError(e));},
    });
  }
}
