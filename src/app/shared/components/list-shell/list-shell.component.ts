import { ViewEncapsulation, Component, input, output } from '@angular/core';
import { EmptyStateComponent } from '../states/empty-state.component';
import { LoadingStateComponent } from '../states/loading-state.component';
import { ErrorStateComponent } from '../states/error-state.component';
@Component({
  styleUrl: './list-shell.component.css',
  encapsulation: ViewEncapsulation.None,
  selector: 'app-list-shell',
  imports: [EmptyStateComponent, LoadingStateComponent, ErrorStateComponent],
  template: `
    <div class="list-container" [attr.aria-busy]="loading()">
      <ng-content select=".list-header" />
      @if (loading()) { <app-loading-state /> }
      @else if (error()) { <app-error-state [message]="error()" (retry)="retry.emit()" /> }
      @else if (empty()) { <app-empty-state [message]="emptyMessage()" /> }
      <div [hidden]="loading() || !!error() || empty()"><ng-content /></div>
    </div>
  `,
  styles: [':host { display: block; min-width: 0; } .list-container { overflow-x: auto; }'],
})
export class ListShellComponent {
  readonly loading = input(false);
  readonly error = input('');
  readonly empty = input(false);
  readonly emptyMessage = input('No hay resultados.');
  readonly retry = output<void>();
}
