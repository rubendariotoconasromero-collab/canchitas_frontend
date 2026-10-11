import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';
import { badgeAppearance, BadgeTone } from './badge.utils';

@Component({
  styleUrl: './badge.component.css',
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <span [class]="'badge-estado badge-tone-' + appearance().tone">
      @if(appearance().icon){<span class="material-symbols-outlined" aria-hidden="true">{{appearance().icon}}</span>}
      <span class="badge-label">{{appearance().label}}</span>
    </span>
  `,
})
export class BadgeComponent {
  active = input(true);
  activeLabel = input('Activo');
  inactiveLabel = input('Inactivo');
  state = input<string | null>(null);
  label = input<string | null>(null);
  tone = input<BadgeTone | null>(null);
  icon = input<string | null>(null);
  readonly appearance = computed(() => badgeAppearance({active:this.active(),
    activeLabel:this.activeLabel(),inactiveLabel:this.inactiveLabel(),state:this.state(),
    label:this.label(),tone:this.tone(),icon:this.icon()}));
}
