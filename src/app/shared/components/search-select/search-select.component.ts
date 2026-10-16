import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, forwardRef, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectOption } from '../select/select.component';
import { filterSelectOptions } from './search-select.utils';

let nextId = 0;

@Component({
  selector: 'app-search-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchSelectComponent), multi: true}],
  styleUrl: './search-select.component.css',
  template: `
    <label class="form-label" [for]="id">{{label()}} @if(required()) {<span class="req">*</span>}</label>
    <div class="search-select" (focusout)="leave($event)">
      <div class="search-select-control">
        <input #field class="form-control" [id]="id" type="text" role="combobox" autocomplete="off"
          [value]="expanded() ? query() : selectedLabel()" [placeholder]="placeholder()" [disabled]="disabled()"
          [required]="required()" [attr.aria-required]="required()" [attr.aria-expanded]="expanded()"
          aria-autocomplete="list" [attr.aria-controls]="id + '-list'"
          [attr.aria-activedescendant]="expanded() && filtered()[active()] ? id + '-option-' + active() : null"
          [attr.aria-invalid]="!!errorMessage()" [attr.aria-describedby]="errorMessage() ? id + '-error' : null"
          (focus)="show()" (input)="search($any($event.target).value)" (keydown)="key($event)" />
        <button type="button" [disabled]="disabled()" [attr.aria-label]="value() ? 'Limpiar seleccion' : 'Abrir opciones'"
          [title]="value() ? 'Limpiar seleccion' : 'Abrir opciones'" (click)="toggle()">
          <span class="material-symbols-outlined" aria-hidden="true">{{value() ? 'close' : 'expand_more'}}</span>
        </button>
      </div>
      @if(expanded()) {
        <div #results class="search-select-results" [id]="id + '-list'" role="listbox" [attr.aria-label]="label()">
          @for(option of filtered(); track option.value; let i = $index) {
            <button type="button" role="option" tabindex="-1" [id]="id + '-option-' + i" [attr.aria-selected]="value() === option.value"
              [class.highlighted]="active() === i" (mousedown)="$event.preventDefault()" (click)="choose(option)">{{option.label}}</button>
          } @empty { <div class="search-select-empty" role="status">Sin coincidencias</div> }
        </div>
      }
    </div>
    @if(errorMessage()) { <div class="invalid-feedback d-block" [id]="id + '-error'">{{errorMessage()}}</div> }
  `,
})
export class SearchSelectComponent implements ControlValueAccessor {
  readonly id = `search-select-${nextId++}`;
  readonly label = input('');
  readonly placeholder = input('Buscar y seleccionar');
  readonly options = input<SelectOption[]>([]);
  readonly required = input(false);
  readonly errorMessage = input('');
  readonly value = signal('');
  readonly disabled = signal(false);
  readonly expanded = signal(false);
  readonly query = signal('');
  readonly active = signal(0);
  readonly filtered = computed(() => filterSelectOptions(this.options(), this.query()));
  readonly selectedLabel = computed(() => this.options().find(option => option.value === this.value())?.label || '');
  private onChange = (_: string) => {};
  private onTouched = () => {};
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly results = viewChild<ElementRef<HTMLElement>>('results');

  constructor() {
    afterRenderEffect(() => {
      this.filtered();
      const option = this.results()?.nativeElement.children[this.active()] as HTMLElement | undefined;
      if(this.expanded()) option?.scrollIntoView({block: 'nearest'});
    });
  }

  writeValue(value: string | number | null): void { this.value.set(value == null ? '' : String(value)); }
  registerOnChange(fn: (_: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled.set(disabled); if(disabled) this.expanded.set(false); }
  show(): void { if(this.disabled()) return; this.query.set(''); this.active.set(Math.max(0, this.options().findIndex(x => x.value === this.value()))); this.expanded.set(true); }
  search(query: string): void {
    if(this.disabled()) return;
    this.query.set(query); this.value.set(''); this.onChange(''); this.active.set(0); this.expanded.set(true);
  }
  choose(option: SelectOption): void {
    if(this.disabled() || !this.options().some(item=>item.value===option.value)) return;
    this.value.set(option.value); this.onChange(option.value); this.onTouched(); this.field()?.nativeElement.focus(); this.expanded.set(false);
  }
  toggle(): void {
    if(this.disabled()) return;
    if(this.value()) { this.value.set(''); this.onChange(''); this.onTouched(); }
    this.expanded() ? this.expanded.set(false) : this.show();
    if(this.expanded()) this.field()?.nativeElement.focus();
  }
  leave(event: FocusEvent): void {
    if((event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) return;
    this.expanded.set(false); this.onTouched();
  }
  key(event: KeyboardEvent): void {
    if(this.disabled()) return;
    if(event.key === 'Escape') { if(this.expanded()) event.stopPropagation(); this.expanded.set(false); return; }
    if(event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if(!this.expanded()) { this.show(); return; }
      this.active.set(Math.max(0, Math.min(this.filtered().length - 1, this.active() + (event.key === 'ArrowDown' ? 1 : -1))));
      return;
    }
    if(event.key === 'Enter' && this.expanded()) {
      event.preventDefault(); const option = this.filtered()[this.active()]; if(option) this.choose(option);
    }
  }
}
