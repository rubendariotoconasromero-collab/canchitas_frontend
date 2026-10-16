import { Component, input } from '@angular/core';
import { LoadingComponent } from '../loading/loading.component';
@Component({
  selector: 'app-loading-state',
  imports: [LoadingComponent],
  template: `<div class="list-empty"><app-loading [message]="message()" /></div>`,
})
export class LoadingStateComponent {
  readonly message = input('Cargando...');
}

