import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

@Component({
  selector: 'app-textarea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextareaComponent), multi: true }],
  template: `
    <label class="form-label" [for]="id">{{ label() }}@if (required()) {<span class="req"> *</span>}</label>
    <textarea class="form-control" [id]="id" [rows]="rows()" [value]="value()"
      [placeholder]="placeholder()" [disabled]="disabled()" [required]="required()"
      [class.is-invalid]="!!errorMessage()" [attr.aria-invalid]="!!errorMessage()"
      [attr.aria-describedby]="errorMessage() || hint() ? id + '-help' : null"
      (input)="update($any($event.target).value)" (blur)="onTouched()"></textarea>
    @if (errorMessage() || hint()) {
      <div [id]="id + '-help'" [class]="errorMessage() ? 'invalid-feedback d-block' : 'form-hint'">{{ errorMessage() || hint() }}</div>
    }
  `,
  styles: [':host { display: block; } textarea { resize: vertical; min-height: 80px; }'],
})
export class TextareaComponent implements ControlValueAccessor {
  readonly id = 'textarea-' + nextId++;
  readonly label = input('');
  readonly placeholder = input('');
  readonly rows = input(3);
  readonly required = input(false);
  readonly errorMessage = input('');
  readonly hint = input('');
  readonly value = signal('');
  readonly disabled = signal(false);
  private onChange = (_: string) => {};
  onTouched = () => {};
  writeValue(value: string | null): void { this.value.set(value ?? ''); }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled.set(disabled); }
  update(value: string): void { this.value.set(value); this.onChange(value); }
}

