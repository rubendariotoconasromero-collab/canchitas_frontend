import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './loading.component.css',
  template: `
    <span class="loading-content" [class.loading-compact]="compact()" [attr.role]="compact() ? null : 'status'" [attr.aria-busy]="true">
      <span class="loading-ring" aria-hidden="true"></span>
      @if(!compact()) {<span class="loading-label">{{message()}}</span>}
    </span>
  `,
})
export class LoadingComponent {
  readonly compact = input(false);
  readonly message = input('Procesando...');
}
