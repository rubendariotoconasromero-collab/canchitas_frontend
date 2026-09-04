import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

@Component({
  styleUrl: './badge.component.css',
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <span class="badge-estado" [class.badge-activo]="active()" [class.badge-inactivo]="!active()">
      <span class="material-symbols-outlined">{{ active() ? 'check_circle' : 'cancel' }}</span>
      {{ active() ? activeLabel() : inactiveLabel() }}
    </span>
  `,
})
export class BadgeComponent {
  active = input(true);
  activeLabel = input('Activo');
  inactiveLabel = input('Inactivo');
}
