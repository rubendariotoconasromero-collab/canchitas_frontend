import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';

export type ButtonVariant =
  | 'primary'
  | 'outline-primary'
  | 'secondary'
  | 'outline-secondary'
  | 'danger'
  | 'outline-danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  styleUrl: './button.component.css',
  selector: 'app-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <button
      [class]="btnClass()"
      [disabled]="disabled() || loading()"
      [type]="type()"
      [title]="title()"
      [attr.aria-label]="title() || null"
      [attr.aria-busy]="loading()"
      [attr.form]="formId() || null"
      [class.w-100]="fullWidth()"
      (click)="clicked.emit($event)"
    >
      @if (loading()) {
        <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
      }
      @if (icon()) {
        <span class="material-symbols-outlined" aria-hidden="true">{{ icon() }}</span>
      }
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  disabled = input(false);
  loading = input(false);
  icon = input('');
  title = input('');
  formId = input('');
  fullWidth = input(false);
  type = input<'button' | 'submit' | 'reset'>('button');

  @Output() clicked = new EventEmitter<MouseEvent>();

  btnClass = computed(() => {
    const classes = ['btn', `btn-${this.variant()}`];
    if (this.size() !== 'md') {
      classes.push(`btn-${this.size()}`);
    }
    return classes.join(' ');
  });
}
