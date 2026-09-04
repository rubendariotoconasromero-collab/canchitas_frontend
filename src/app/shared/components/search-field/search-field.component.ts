import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  styleUrl: './search-field.component.css',
  selector: 'app-search-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search-field">
      <span class="material-symbols-outlined" aria-hidden="true">search</span>
      <input #search type="search" [attr.aria-label]="label()" [placeholder]="label()"
        [value]="value()" (input)="value.set($any($event.target).value)" />
      <button type="button" title="Limpiar busqueda" aria-label="Limpiar busqueda"
        [style.visibility]="value() ? 'visible' : 'hidden'" (click)="value.set(''); search.focus()">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; width: min(380px, 100%); }
    .search-field { width: 100%; }
    .search-field:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--focus-ring); }
    .search-field input { min-width: 0; }
    .search-field input::-webkit-search-cancel-button { display: none; }
    .search-field button { background: none; border: 0; padding: 0; color: inherit; width: 24px; height: 24px; flex-shrink: 0; }
  `],
})
export class SearchFieldComponent {
  readonly label = input('Buscar');
  readonly value = model('');
}
