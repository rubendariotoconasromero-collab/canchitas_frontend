import { Component, input } from '@angular/core';
@Component({
  selector: 'app-empty-state',
  template: `<div class="list-empty" role="status"><span class="material-symbols-outlined" aria-hidden="true">{{ icon() }}</span>{{ message() }}</div>`,
})
export class EmptyStateComponent {
  readonly icon = input('search_off');
  readonly message = input('No hay resultados.');
}

