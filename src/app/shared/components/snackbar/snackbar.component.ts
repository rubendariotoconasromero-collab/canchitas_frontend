import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  styleUrl: './snackbar.component.css',
  selector: 'app-snackbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="snackbar-container">
      @for (message of snackbar.messages(); track message.id) {
        <div class="snackbar-item snackbar-{{ message.type }}" (click)="snackbar.dismiss(message.id)">
          <span class="material-symbols-outlined">{{ iconFor(message.type) }}</span>
          <span>{{ message.message }}</span>
        </div>
      }
    </div>
  `,
})
export class SnackbarComponent {
  readonly snackbar = inject(SnackbarService);

  iconFor(type: string): string {
    const icons: Record<string, string> = {
      success: 'check_circle',
      error: 'error',
      info: 'info',
      warning: 'warning',
    };
    return icons[type] ?? 'info';
  }
}
