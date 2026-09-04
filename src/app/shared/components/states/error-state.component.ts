import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
@Component({
  selector: 'app-error-state',
  imports: [ButtonComponent],
  template: `<div class="list-empty" role="alert"><span class="material-symbols-outlined" aria-hidden="true">error</span>{{ message() }}<app-button icon="refresh" variant="outline-primary" (clicked)="retry.emit()">Reintentar</app-button></div>`,
})
export class ErrorStateComponent {
  readonly message = input('No se pudieron cargar los datos.');
  readonly retry = output<void>();
}

