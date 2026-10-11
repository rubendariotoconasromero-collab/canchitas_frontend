import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonVariant } from './button.component';

@Component({
  selector: 'app-button-link',
  imports: [RouterLink],
  styleUrl: './button.component.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="route()" [queryParams]="queryParams()" [class]="'btn btn-' + variant()">
      @if (icon()) { <span class="material-symbols-outlined" aria-hidden="true">{{ icon() }}</span> }
      <ng-content />
    </a>
  `,
})
export class ButtonLinkComponent {
  readonly route = input.required<string>();
  readonly icon = input('');
  readonly variant = input<ButtonVariant>('primary');
  readonly queryParams = input<Record<string, string> | null>(null);
}
