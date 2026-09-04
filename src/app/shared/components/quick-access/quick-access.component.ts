import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  styleUrl: './quick-access.component.css',
  selector: 'app-quick-access',
  imports: [RouterLink],
  template: `<a [routerLink]="route()" class="quick-access-item">
    <span class="quick-access-icon material-symbols-outlined" aria-hidden="true">{{ icon() }}</span>
    <span class="quick-access-copy"><strong>{{ label() }}</strong><small>{{ description() }}</small></span>
    <span class="material-symbols-outlined quick-access-arrow" aria-hidden="true">arrow_forward</span>
  </a>`,
})
export class QuickAccessComponent {
  readonly label = input.required<string>();
  readonly description = input('');
  readonly route = input.required<string>();
  readonly icon = input.required<string>();
}
