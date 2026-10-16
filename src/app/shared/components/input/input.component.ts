import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator, Validators } from '@angular/forms';

let nextId = 0;

export type InputType = 'text' | 'email' | 'password' | 'number' | 'date' | 'time' | 'url' | 'tel' | 'search';

@Component({
  selector: 'app-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => InputComponent),
    multi: true,
  }, { provide: NG_VALIDATORS, useExisting: forwardRef(() => InputComponent), multi: true }],
  template: `
    @if (label()) {
      <label class="form-label" [for]="id">
        {{ label() }}@if (required()) {<span class="req"> *</span>}
      </label>
    }

    @if (showToggle()) {
      <div class="inp-pw-field">
        <input
          class="form-control"
          [id]="id"
          [attr.autocomplete]="autocomplete()"
          [required]="required()"
          [attr.aria-invalid]="!!errorMessage() || invalid()"
          [attr.aria-describedby]="errorMessage() || hint() ? id + '-help' : null"
          [class.is-invalid]="!!errorMessage() || invalid()"
          [type]="_showPassword() ? 'text' : 'password'"
          [placeholder]="placeholder()"
          [disabled]="_disabled()"
          [value]="_value()"
          (input)="onInput($any($event.target).value)"
          (blur)="onBlur()"
        />
        <button type="button" class="inp-pw-toggle" [disabled]="_disabled()" [attr.aria-label]="_showPassword() ? 'Ocultar password' : 'Mostrar password'" [title]="_showPassword() ? 'Ocultar password' : 'Mostrar password'" (click)="_showPassword.set(!_showPassword())">
          <span class="material-symbols-outlined">{{ _showPassword() ? 'visibility_off' : 'visibility' }}</span>
        </button>
      </div>
    } @else {
      <input
        class="form-control"
          [id]="id"
          [attr.autocomplete]="autocomplete()"
          [required]="required()"
          [attr.aria-invalid]="!!errorMessage() || invalid()"
          [attr.aria-describedby]="errorMessage() || hint() ? id + '-help' : null"
        [class.is-invalid]="!!errorMessage() || invalid()"
        [type]="type()"
        [attr.step]="type() === 'number' ? step() : null"
        [attr.min]="type() === 'number' ? min() : null"
        [attr.max]="type() === 'number' ? max() : null"
        [placeholder]="placeholder()"
        [disabled]="_disabled()"
        [value]="_value()"
        (input)="onInput($any($event.target).value)"
        (blur)="onBlur()"
      />
    }

    @if (errorMessage()) {
      <div [id]="id + '-help'" class="invalid-feedback d-block">{{ errorMessage() }}</div>
    } @else if (hint()) {
      <div [id]="id + '-help'" class="form-hint">{{ hint() }}</div>
    }
  `,
})
export class InputComponent implements ControlValueAccessor, Validator {
  readonly id = 'input-' + nextId++;
  readonly autocomplete = input('off');
  label = input('');
  type = input<InputType>('text');
  showToggle = input(false);
  placeholder = input('');
  errorMessage = input('');
  invalid = input(false);
  required = input(false);
  hint = input('');
  step = input<number | null>(null);
  min = input<number | null>(null);
  max = input<number | null>(null);

  _value = signal('');
  _disabled = signal(false);
  _showPassword = signal(false);

  private onChange = (_: string) => {};
  private onTouched = () => {};
  private validatorChanged = () => {};

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (this.required() && (value == null || String(value).trim() === '')) return {required: true};
    if (value == null || value === '') return null;
    if (this.type() === 'email') return Validators.email(control);
    if (this.type() === 'url') {
      try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol) ? null : {url: true}; }
      catch { return {url: true}; }
    }
    if (this.type() !== 'number') return null;
    if (!Number.isFinite(Number(value))) return {number: true};
    return (this.min() == null ? null : Validators.min(this.min()!)(control))
      || (this.max() == null ? null : Validators.max(this.max()!)(control));
  }
  registerOnValidatorChange(fn: () => void): void { this.validatorChanged = fn; }
  ngOnChanges(): void { this.validatorChanged(); }

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

  onInput(value: string): void {
    this._value.set(value);
    this.onChange(value);
  }

  onBlur(): void {
    this.onTouched();
  }
}
