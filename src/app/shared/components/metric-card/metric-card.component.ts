import { Component, input } from '@angular/core';
@Component({
  styleUrl: './metric-card.component.css',
  selector: 'app-metric-card',
  template: `<article class="metric-card">
    <span [class]="'metric-icon material-symbols-outlined metric-icon-' + tone()" aria-hidden="true">{{ icon() }}</span>
    <div><span>{{ label() }}</span><strong>{{ value() }}</strong></div>
  </article>`,
})
export class MetricCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly icon = input.required<string>();
  readonly tone = input<'green' | 'gold' | 'blue'>('green');
}
