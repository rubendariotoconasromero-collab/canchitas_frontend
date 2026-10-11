import { ChangeDetectionStrategy, Component, ViewEncapsulation, input, model, output } from '@angular/core';
import { SearchFieldComponent } from '../search-field/search-field.component';
import { ButtonComponent } from '../button/button.component';

@Component({
  styleUrl: './list-toolbar.component.css',
  selector: 'app-list-toolbar',
  imports: [SearchFieldComponent, ButtonComponent],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="module-toolbar" role="group" [attr.aria-label]="label()">
      <div class="module-filters"><ng-content select="[toolbar-filter]" /></div>
      @if(searchEnabled()) {<app-search-field [label]="searchLabel()" [placeholder]="searchPlaceholder()" [(value)]="query" />}
      <div class="module-summary">
        @if(total() !== null || active() !== null) {
          <div class="module-counts" aria-live="polite">
            @if(total() !== null){<span>{{ total() }} {{ entity() }}</span>}
            @if(active() !== null){<span>{{ active() }} activos</span>}
          </div>
        }
        <ng-content />
        @if(showRefresh()) {<app-button variant="outline-secondary" icon="refresh" [title]="refreshLabel()" [disabled]="loading()" (clicked)="refreshed.emit()" />}
      </div>
    </div>
  `,
})
export class ListToolbarComponent {
  readonly searchLabel = input('Buscar');
  readonly label = input('Filtros del listado');
  readonly searchEnabled = input(true);
  readonly searchPlaceholder = input('');
  readonly entity = input('registros');
  readonly total = input<number | null>(null);
  readonly active = input<number | null>(null);
  readonly showRefresh = input(false);
  readonly refreshLabel = input('Actualizar listado');
  readonly loading = input(false);
  readonly refreshed = output<void>();
  readonly query = model('');
}
