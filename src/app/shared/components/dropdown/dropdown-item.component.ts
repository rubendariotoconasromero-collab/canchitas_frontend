import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  ViewEncapsulation,
  inject,
  input,
} from '@angular/core';
import { DropdownComponent } from './dropdown.component';

@Component({
  selector: 'app-dropdown-item',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (divided()) {
      <div class="dropdown-divider" role="separator"></div>
    }
    <button
      type="button"
      class="dropdown-item-btn"
      [class.is-danger]="danger()"
      [disabled]="disabled()"
      [attr.aria-disabled]="disabled() ? 'true' : null"
      role="menuitem"
      (click)="onClick($event)"
    >
      @if (icon()) {
        <span class="material-symbols-outlined" aria-hidden="true">{{ icon() }}</span>
      }
      @if (label()) {
        <span>{{ label() }}</span>
      }
      <ng-content />
    </button>
  `,
})
export class DropdownItemComponent {
  private readonly dropdown = inject(DropdownComponent, { optional: true });

  label = input<string>('');
  icon = input<string>('');
  danger = input<boolean>(false);
  disabled = input<boolean>(false);
  divided = input<boolean>(false);

  @Output() clicked = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled()) return;
    this.clicked.emit(event);
    this.dropdown?.close();
  }
}
