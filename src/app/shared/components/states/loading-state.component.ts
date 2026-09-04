import { Component, input } from '@angular/core';
@Component({
  selector: 'app-loading-state',
  template: `<div class="list-empty" role="status"><span class="spinner-border" aria-hidden="true"></span>{{ message() }}</div>`,
})
export class LoadingStateComponent {
  readonly message = input('Cargando...');
}

