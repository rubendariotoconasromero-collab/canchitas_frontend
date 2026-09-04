import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from './input/input.component';
import { SelectComponent } from './select/select.component';
import { TextareaComponent } from './textarea/textarea.component';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { ButtonComponent } from './button/button.component';
import { SearchFieldComponent } from './search-field/search-field.component';
import { ModalComponent } from './modal/modal.component';
import { ListShellComponent } from './list-shell/list-shell.component';
import { AccessFormModalComponent } from '../../features/access/components/access-form-modal.component';

@Component({
  imports: [ReactiveFormsModule, InputComponent, SelectComponent, TextareaComponent, CheckboxComponent],
  template: `
    <app-input label="Nombre" [formControl]="name" />
    <app-select label="Sucursal" [options]="options" placeholder="Todas" [formControl]="branch" />
    <app-textarea label="Descripcion" [formControl]="description" />
    <app-checkbox label="Activo" [formControl]="active" />
  `,
})
class FormHost {
  name = new FormControl('Ana');
  branch = new FormControl('1');
  description = new FormControl('Texto');
  active = new FormControl(true);
  options = [{ value: '1', label: 'Central' }, { value: '2', label: 'Norte' }];
}

describe('Shared form controls', () => {
  it('synchronizes values, touched state, disabled state and resets', async () => {
    const fixture = TestBed.createComponent(FormHost);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const name = root.querySelector('app-input input') as HTMLInputElement;
    const select = root.querySelector('select') as HTMLSelectElement;
    const textarea = root.querySelector('textarea') as HTMLTextAreaElement;
    const checkbox = root.querySelector('[type=checkbox]') as HTMLInputElement;
    expect(name.value).toBe('Ana');
    expect(select.value).toBe('1');
    expect(textarea.value).toBe('Texto');
    expect(checkbox.checked).toBeTrue();
    expect(root.querySelector('label')?.htmlFor).toBe(name.id);
    name.value = 'Luis';
    name.dispatchEvent(new Event('input'));
    name.dispatchEvent(new Event('blur'));
    textarea.value = 'Nuevo texto';
    textarea.dispatchEvent(new Event('input'));
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    checkbox.click();
    expect(host.name.value).toBe('Luis');
    expect(host.name.touched).toBeTrue();
    expect(host.description.value).toBe('Nuevo texto');
    expect(host.branch.value).toBe('2');
    expect(host.active.value).toBeFalse();
    host.name.disable(); host.branch.disable(); host.description.disable(); host.active.disable();
    fixture.detectChanges();
    expect([name, select, textarea, checkbox].every(control => control.disabled)).toBeTrue();
    host.branch.enable();
    host.branch.reset('');
    fixture.detectChanges();
    expect(select.value).toBe('');
    host.options = [{ value: '3', label: 'Sur' }];
    host.branch.setValue('3');
    fixture.detectChanges();
    expect(select.value).toBe('3');
  });

  it('links errors and toggles password visibility with an accessible button', () => {
    const fixture = TestBed.createComponent(InputComponent);
    fixture.componentRef.setInput('showToggle', true);
    fixture.componentRef.setInput('errorMessage', 'Requerido');
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const input = root.querySelector('input')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('#' + input.getAttribute('aria-describedby'))?.textContent).toBe('Requerido');
    root.querySelector('button')!.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(root.querySelector('button')!.getAttribute('aria-label')).toBe('Ocultar password');
  });
});

describe('Shared actions and list states', () => {
  it('blocks a loading button', () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentRef.setInput('loading', true);
    const clicked = spyOn(fixture.componentInstance.clicked, 'emit');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    expect(clicked).not.toHaveBeenCalled();
  });

  it('clears a search and returns focus', () => {
    const fixture = TestBed.createComponent(SearchFieldComponent);
    fixture.componentRef.setInput('value', 'Ana');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('');
    expect(fixture.nativeElement.querySelector('input').value).toBe('');
  });

  it('prioritizes loading, errors and empty states and emits retry', () => {
    const fixture = TestBed.createComponent(ListShellComponent);
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('empty', true);
    fixture.componentRef.setInput('error', 'Sin conexion');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loading-state')).not.toBeNull();
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    const retry = spyOn(fixture.componentInstance.retry, 'emit');
    fixture.nativeElement.querySelector('app-error-state button').click();
    expect(retry).toHaveBeenCalled();
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
    fixture.componentRef.setInput('empty', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-empty-state')).toBeNull();
  });
});

describe('Shared modal', () => {
  it('opens natively, protects busy dialogs and restores focus on close', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const fixture = TestBed.createComponent(ModalComponent);
    fixture.componentRef.setInput('title', 'Editar');
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialog.open).toBeTrue();
    expect(dialog.contains(document.activeElement)).toBeTrue();
    const closed = spyOn(fixture.componentInstance.closed, 'emit');
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(closed).not.toHaveBeenCalled();
    fixture.componentRef.setInput('busy', false);
    fixture.detectChanges();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(closed).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dialog.open).toBeFalse();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});

describe('Access catalog form', () => {
  it('validates, emits data, prevents duplicate submission and resets when reopened', async () => {
    const fixture = TestBed.createComponent(AccessFormModalComponent);
    fixture.componentRef.setInput('entity', 'rol');
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const saved = spyOn(component.saved, 'emit');
    component.submit();
    expect(saved).not.toHaveBeenCalled();
    expect(component.form.controls.nombre.touched).toBeTrue();
    component.form.controls.nombre.setValue('Operador');
    component.submit();
    expect(saved).toHaveBeenCalledWith({ nombre: 'Operador', descripcion: '', estado: true });
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    component.submit();
    expect(saved).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('saving', false);
    fixture.componentRef.setInput('data', { nombre: 'Editor', estado: false });
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(component.form.getRawValue()).toEqual({ nombre: 'Editor', descripcion: '', estado: false });
    expect(component.form.pristine).toBeTrue();
  });
});
