import { TestBed } from '@angular/core/testing';
import { UsuarioModalComponent } from './usuario-modal.component';
import { UsuarioAsignacionesModalComponent } from './usuario-asignaciones-modal.component';

describe('User forms using shared components', () => {
  it('validates creation and keeps the API payload unchanged', async () => {
    const fixture = TestBed.createComponent(UsuarioModalComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const saved = spyOn(component.saved, 'emit');
    component.submit();
    expect(saved).not.toHaveBeenCalled();
    component.form.patchValue({ nombre: 'Ana', correo: 'ana@example.test', password: 'Testing123', sucursal_id: '2' });
    component.submit();
    expect(saved).toHaveBeenCalledWith({ nombre: 'Ana', correo: 'ana@example.test', password: 'Testing123', sucursal_id: 2 });
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    component.submit();
    expect(saved).toHaveBeenCalledTimes(1);
  });

  it('does not send an empty password when editing', async () => {
    const fixture = TestBed.createComponent(UsuarioModalComponent);
    fixture.componentRef.setInput('editing', true);
    fixture.componentRef.setInput('data', { nombre: 'Ana', correo: 'ana@example.test', sucursal_id: null, estado: false });
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const saved = spyOn(fixture.componentInstance.saved, 'emit');
    fixture.componentInstance.submit();
    expect(saved).toHaveBeenCalledWith({ nombre: 'Ana', correo: 'ana@example.test', sucursal_id: null, estado: false });
  });

  it('uses role-permission pivot IDs, not permission IDs', async () => {
    const fixture = TestBed.createComponent(UsuarioAsignacionesModalComponent);
    const rol = { id: 1, nombre: 'Editor', estado: true, permisos: [
      { id: 3, nombre: 'Editar', estado: true, pivot: { id: 99 } },
    ] };
    fixture.componentRef.setInput('roles', [rol]);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const saved = spyOn(component.saved, 'emit');
    component.toggleRol(rol);
    component.save();
    expect(saved).toHaveBeenCalledWith([99]);
    component.toggleRol(rol);
    expect(component.selectedIds().size).toBe(0);
  });
});
