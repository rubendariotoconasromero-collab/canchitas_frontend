import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { SearchFieldComponent } from '../search-field/search-field.component';

@Component({
  styleUrl: './list-toolbar.component.css',
  selector: 'app-list-toolbar',
  imports: [SearchFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="module-toolbar">
      <app-search-field [label]="searchLabel()" [(value)]="query" />
      <ng-content />
      <div class="module-summary" aria-live="polite">
        <span>{{ total() }} {{ entity() }}</span><span>{{ active() }} activos</span>
      </div>
    </div>
  `,
})
export class ListToolbarComponent {
  readonly searchLabel = input('Buscar');
  readonly entity = input('registros');
  readonly total = input(0);
  readonly active = input(0);
  readonly query = model('');
}
