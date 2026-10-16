import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelectComponent),
    multi: true,
  }],
  template: `
    @if (label()) {
      <label class="form-label" [for]="id">
        {{ label() }}@if (required()) {<span class="req"> *</span>}
      </label>
    }
    <select
      class="form-select"
      [id]="id" [required]="required()"
      [attr.aria-invalid]="!!errorMessage() || invalid()"
      [attr.aria-describedby]="errorMessage() || hint() ? id + '-help' : null"
      [class.is-invalid]="!!errorMessage() || invalid()"
      [disabled]="_disabled()"
      (change)="onSelect($any($event.target).value)"
      (blur)="onBlur()"
    >
      <option value="" [selected]="_value() === ''">{{ placeholder() || 'Seleccionar' }}</option>
      @for (option of options(); track option.value) {
        <option [value]="option.value" [selected]="_value() === option.value">{{ option.label }}</option>
      }
    </select>
    @if (errorMessage()) {
      <div [id]="id + '-help'" class="invalid-feedback d-block">{{ errorMessage() }}</div>
    } @else if (hint()) {
      <div [id]="id + '-help'" class="form-hint">{{ hint() }}</div>
    }
  `,
})
export class SelectComponent implements ControlValueAccessor {
  readonly id = 'select-' + nextId++;

  label = input('');
  options = input<SelectOption[]>([]);
  placeholder = input('');
  errorMessage = input('');
  invalid = input(false);
  required = input(false);
  hint = input('');

  _value = signal('');
  _disabled = signal(false);

  private onChange = (_: string) => {};
  private onTouched = () => {};

  writeValue(value: string | number | null): void {
    this._value.set(value != null ? String(value) : '');
  }

  registerOnChange(fn: (_: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }

  onSelect(value: string): void {
    this._value.set(value);
    this.onChange(value);
  }

  onBlur(): void {
    this.onTouched();
  }
}
