import { Component, computed, inject, signal } from '@angular/core';
import { RESERVAS_UI } from '../reservas/reservas-ui';
import { apiError } from '../reservas/reservas.service';
import { CajaService, CashBox } from './caja.service';
import { DropdownComponent, DropdownItemComponent } from '../../shared/components/dropdown';
import { SnackbarService } from '../../core/services/snackbar.service';

@Component({
  selector: 'app-cajas-admin',
  imports: [...RESERVAS_UI, DropdownComponent, DropdownItemComponent],
  template: `
    <div class="main-content">
      <app-page-header title="Administracion de cajas" icon="payments" backRoute="/caja">
        <app-button icon="add" [disabled]="saving()" (clicked)="newBox()">Nueva caja</app-button>
      </app-page-header>
      <app-list-toolbar searchLabel="Buscar caja" searchPlaceholder="Nombre o sucursal"
        [(query)]="query" [total]="filtered().length" [loading]="loading()" [showRefresh]="true" (refreshed)="load()">
        <app-select toolbar-filter label="Estado" placeholder="Todos" [options]="stateOptions" [(ngModel)]="state" />
      </app-list-toolbar>
      <app-form-error [message]="error()" />
      <app-list-shell [loading]="loading()" [error]="loadError()" [empty]="!filtered().length" (retry)="load()">
        <app-table label="Administracion de cajas">
          <thead><tr><th scope="col">Caja</th><th scope="col">Sucursal</th><th scope="col">Estado</th><th scope="col">Turno</th><th scope="col" class="text-center">Acciones</th></tr></thead>
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
        </app-table>
      </app-list-shell>
    </div>
    <app-modal [open]="creating() || !!editing()" [title]="creating() ? 'Nueva caja' : 'Editar nombre de caja'" [icon]="creating() ? 'add' : 'edit'" [busy]="saving()" (closed)="closeEditor()">
      <form #form="ngForm" (ngSubmit)="form.valid && saveName()" novalidate>
        <div class="modal-body">
          <app-form-error [message]="formError()" [active]="creating() || !!editing()" />
          <app-input name="nombre" label="Nombre de caja" [(ngModel)]="name" [required]="true" />
          @if(creating()){
            <app-select name="sucursal" label="Sucursal" placeholder="Seleccionar" [options]="branchOptions()" [(ngModel)]="branch" [required]="true" [disabled]="optionsLoading()" />
            @if(optionsError()){<app-form-error [message]="optionsError()" /><app-button variant="outline-secondary" icon="refresh" (clicked)="loadBranches()">Reintentar</app-button>}
          }
        </div>
        <div class="modal-footer"><app-button variant="outline-secondary" [disabled]="saving()" (clicked)="closeEditor()">Cancelar</app-button>
          <app-button type="submit" icon="save" [loading]="saving() || optionsLoading()" [disabled]="form.invalid || !name.trim() || name.trim().length>100 || (creating() && (optionsLoading() || !validBranch))">Guardar</app-button></div>
      </form>
    </app-modal>
    <app-modal [open]="!!toggleTarget()" [title]="toggleTarget()?.activa ? 'Desactivar caja' : 'Activar caja'" icon="help" [busy]="saving()" (closed)="toggleTarget.set(null)">
      <div class="modal-body"><p>{{toggleTarget()?.activa ? 'Desactivar' : 'Activar'}} la caja {{toggleTarget()?.nombre}}?</p>
        <app-form-error [message]="formError()" [active]="!!toggleTarget()" />
      </div>
      <div class="modal-footer"><app-button variant="outline-secondary" [disabled]="saving()" (clicked)="toggleTarget.set(null)">Cancelar</app-button>
        <app-button [variant]="toggleTarget()?.activa ? 'danger' : 'primary'" [loading]="saving()" (clicked)="toggle()">Confirmar</app-button></div>
    </app-modal>
  `,
})
export class CajasAdminComponent {
  private readonly snackbar=inject(SnackbarService);
  private readonly api=inject(CajaService);
  readonly rows=signal<CashBox[]>([]);
  readonly loading=signal(false); readonly saving=signal(false);
  readonly loadError=signal(''); readonly error=signal(''); readonly formError=signal('');
  readonly query=signal(''); readonly state=signal('');
  readonly editing=signal<CashBox|null>(null); readonly toggleTarget=signal<CashBox|null>(null);
  readonly creating=signal(false); readonly optionsLoading=signal(false); readonly optionsError=signal('');
  readonly branchOptions=signal<{value:string;label:string}[]>([]);
  branch=''; private optionsSequence=0;
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
  get validBranch(){return this.branchOptions().some(b=>b.value===this.branch);}
  newBox(){if(this.saving())return;this.editing.set(null);this.name='';this.branch='';this.formError.set('');this.creating.set(true);this.loadBranches();}
  loadBranches(){
    if(!this.creating())return;
    const seq=++this.optionsSequence;this.optionsLoading.set(true);this.optionsError.set('');this.branchOptions.set([]);
    this.api.options().subscribe({
      next:data=>{if(seq!==this.optionsSequence)return;this.branchOptions.set(data.sucursales.map(b=>({value:String(b.id),label:b.nombre})));this.branch=this.validBranch?this.branch:this.branchOptions()[0]?.value||'';this.optionsLoading.set(false);},
      error:e=>{if(seq!==this.optionsSequence)return;this.optionsLoading.set(false);this.optionsError.set(apiError(e));},
    });
  }
  closeEditor(){if(this.saving())return;this.optionsSequence++;this.optionsLoading.set(false);this.creating.set(false);this.editing.set(null);}
  edit(box:CashBox){if(this.saving())return;this.closeEditor();this.formError.set('');this.name=box.nombre;this.editing.set(box);}
  askToggle(box:CashBox){
    if(this.saving())return;
    this.error.set('');
    if(box.activa && box.sesion_actual){this.error.set('Cierra el turno antes de desactivar la caja.');return;}
    this.formError.set('');this.toggleTarget.set(box);
  }
  saveName(){
    const name=this.name.trim();if(!name || name.length>100 || this.saving())return;
    if(this.creating()){
      if(this.optionsLoading()||!this.validBranch)return;
      this.saving.set(true);this.formError.set('');
      this.api.createBox(name,Number(this.branch)).subscribe({
        next:()=>{this.snackbar.success('Caja creada correctamente.');this.saving.set(false);this.closeEditor();this.error.set('');this.load();},
        error:e=>{this.saving.set(false);this.formError.set(apiError(e));},
      });
      return;
    }
    const box=this.editing();if(box)this.update(box,{nombre:name});
  }
  toggle(){const box=this.toggleTarget();if(!box || this.saving())return;if(box.activa && box.sesion_actual)return;this.update(box,{activa:!box.activa});}
  private update(box:CashBox,data:{nombre?:string;activa?:boolean}){
    this.saving.set(true);this.formError.set('');
    this.api.updateBox(box.id,data).subscribe({
      next:()=>{this.snackbar.success(data.nombre !== undefined ? 'Nombre de caja actualizado correctamente.' : data.activa ? 'Caja activada correctamente.' : 'Caja desactivada correctamente.');this.saving.set(false);this.editing.set(null);this.toggleTarget.set(null);this.error.set('');this.load();},
      error:e=>{this.saving.set(false);this.formError.set(apiError(e));},
    });
  }
}
