import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  styleUrl: './page-header.component.css',
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <h2 class="page-title">
        @if (icon()) { <span class="material-symbols-outlined" aria-hidden="true">{{ icon() }}</span> }
        {{ title() }}
      </h2>
      <div class="page-actions"><ng-content /></div>
    </header>
  `,
  styles: [':host { display: block; } .page-actions { display: flex; gap: .5rem; flex-wrap: wrap; }'],
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly icon = input('');
}
