import { ChangeDetectionStrategy, Component, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CheckboxComponent), multi: true }],
  template: `
    <label class="checkbox-field">
      <input type="checkbox" class="form-check-input" [checked]="checked() ?? value()"
        [disabled]="disabled() || formDisabled()" (change)="update($any($event.target).checked)"
        (blur)="onTouched()" />
      <span>{{ label() }}</span>
    </label>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .checkbox-field { display: flex; align-items: flex-start; gap: .5rem; cursor: pointer;
      color: var(--text-700); font-size: var(--text-sm); padding: .2rem 0; }
    input { flex: 0 0 16px; width: 16px; height: 16px; }
    span { overflow-wrap: anywhere; min-width: 0; }
    .checkbox-field:has(input:disabled) { cursor: default; opacity: .65; }
  `],
})
export class CheckboxComponent implements ControlValueAccessor {
  readonly label = input('');
  readonly checked = input<boolean | undefined>(undefined);
  readonly disabled = input(false);
  readonly checkedChange = output<boolean>();
  readonly value = signal(false);
  readonly formDisabled = signal(false);
  private onChange = (_: boolean) => {};
  onTouched = () => {};
  writeValue(value: boolean | null): void { this.value.set(!!value); }
  registerOnChange(fn: (value: boolean) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.formDisabled.set(disabled); }
  update(value: boolean): void { this.value.set(value); this.onChange(value); this.checkedChange.emit(value); }
}

