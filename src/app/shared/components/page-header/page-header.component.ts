import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { PageNavigationService } from '../../../core/services/page-navigation.service';

@Component({
  styleUrl: './page-header.component.css',
  selector: 'app-page-header',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <h2 class="page-title">
        @if (icon()) { <span class="material-symbols-outlined" aria-hidden="true">{{ icon() }}</span> }
        <span>{{ title() }}</span>
      </h2>
      <div class="page-actions">
        <ng-content />
        @if(showBack()) {
          <app-button variant="outline-secondary" icon="keyboard_double_arrow_left" [title]="backLabel()" (clicked)="goBack()">{{backLabel()}}</app-button>
        }
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly icon = input('');
  readonly showBack = input(true);
  readonly backRoute = input<string | null>(null);
  readonly backLabel = input('Regresar');
  private readonly navigation = inject(PageNavigationService);
  goBack(): void { this.navigation.back(this.backRoute()); }
}
