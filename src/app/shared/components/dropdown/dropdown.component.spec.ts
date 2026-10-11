import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DropdownComponent } from './dropdown.component';
import { DropdownItemComponent } from './dropdown-item.component';
import { DropdownItemConfig } from './dropdown.model';

@Component({
  standalone: true,
  imports: [DropdownComponent, DropdownItemComponent],
  template: `
    <div id="outside-element">Fuera</div>
    <app-dropdown [title]="'Opciones de prueba'" [triggerIcon]="'more_vert'">
      <app-dropdown-item
        icon="edit"
        label="Editar"
        (clicked)="onEdit()"
      />
      <app-dropdown-item
        icon="delete"
        label="Eliminar"
        [danger]="true"
        [disabled]="deleteDisabled"
        (clicked)="onDelete()"
      />
    </app-dropdown>

    <app-dropdown id="array-dropdown" [items]="configItems" />
  `,
})
class TestDropdownHost {
  editClicked = false;
  deleteClicked = false;
  deleteDisabled = false;
  configActionClicked = false;

  configItems: DropdownItemConfig[] = [
    {
      label: 'Accion Config',
      icon: 'settings',
      action: () => {
        this.configActionClicked = true;
      },
    },
  ];

  onEdit(): void {
    this.editClicked = true;
  }

  onDelete(): void {
    this.deleteClicked = true;
  }
}

describe('DropdownComponent', () => {
  let fixture: ComponentFixture<TestDropdownHost>;
  let host: TestDropdownHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestDropdownHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestDropdownHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders trigger button and starts closed', () => {
    const trigger = fixture.nativeElement.querySelector('.dropdown-trigger') as HTMLButtonElement;
    expect(trigger).toBeTruthy();
    expect(trigger.querySelector('.dropdown-trigger-label')?.textContent?.trim()).toBe('Acciones');
    expect(trigger.querySelector('.dropdown-chevron')).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.dropdown-menu')).toBeNull();
  });

  it('opens on trigger click and closes on second click', () => {
    const trigger = fixture.nativeElement.querySelector('.dropdown-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.dropdown-menu')).toBeTruthy();

    trigger.click();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.dropdown-menu')).toBeNull();
  });

  it('executes item action and closes on dropdown item click', () => {
    const trigger = fixture.nativeElement.querySelector('.dropdown-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const editBtn = fixture.nativeElement.querySelectorAll('.dropdown-item-btn')[0] as HTMLButtonElement;
    expect(editBtn.textContent).toContain('Editar');
    editBtn.click();
    fixture.detectChanges();

    expect(host.editClicked).toBeTrue();
    expect(fixture.nativeElement.querySelector('.dropdown-menu')).toBeNull();
  });

  it('does not trigger action when item is disabled', () => {
    host.deleteDisabled = true;
    const trigger = fixture.nativeElement.querySelector('.dropdown-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const deleteBtn = fixture.nativeElement.querySelectorAll('.dropdown-item-btn')[1] as HTMLButtonElement;
    expect(deleteBtn.disabled).toBeTrue();
    deleteBtn.click();
    fixture.detectChanges();

    expect(host.deleteClicked).toBeFalse();
    // Menu remains open
    expect(fixture.nativeElement.querySelector('.dropdown-menu')).toBeTruthy();
  });

  it('closes on click outside', () => {
    const trigger = fixture.nativeElement.querySelector('.dropdown-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dropdown-menu')).toBeTruthy();

    const outside = fixture.nativeElement.querySelector('#outside-element') as HTMLElement;
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dropdown-menu')).toBeNull();
  });

  it('closes on Escape key press', () => {
    const trigger = fixture.nativeElement.querySelector('.dropdown-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dropdown-menu')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dropdown-menu')).toBeNull();
  });

  it('supports items configuration array', () => {
    const arrayTrigger = fixture.nativeElement.querySelector('#array-dropdown .dropdown-trigger') as HTMLButtonElement;
    arrayTrigger.click();
    fixture.detectChanges();

    const itemBtn = fixture.nativeElement.querySelector('#array-dropdown .dropdown-item-btn') as HTMLButtonElement;
    expect(itemBtn.textContent).toContain('Accion Config');
    itemBtn.click();
    fixture.detectChanges();

    expect(host.configActionClicked).toBeTrue();
    expect(fixture.nativeElement.querySelector('#array-dropdown .dropdown-menu')).toBeNull();
  });
});
