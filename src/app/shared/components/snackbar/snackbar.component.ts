import { afterRenderEffect, ChangeDetectionStrategy, Component, ElementRef, inject, viewChild, ViewEncapsulation } from '@angular/core';
import { SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  styleUrl: './snackbar.component.css',
  selector: 'app-snackbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div #container class="snackbar-container" popover="manual">
      @for (message of snackbar.messages(); track message.id) {
        <div class="snackbar-item snackbar-{{ message.type }}" [attr.role]="message.type === 'error' ? 'alert' : 'status'" aria-atomic="true">
          <span class="material-symbols-outlined snackbar-icon" aria-hidden="true">{{ iconFor(message.type) }}</span>
          <span class="snackbar-text">{{ message.message }}</span>
          <button type="button" class="snackbar-close" aria-label="Cerrar notificacion" title="Cerrar notificacion" (click)="snackbar.dismiss(message.id)"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </div>
      }
    </div>
  `,
})
export class SnackbarComponent {
  readonly snackbar = inject(SnackbarService);
  private readonly container = viewChild<ElementRef<HTMLElement>>('container');

  constructor() {
    // Native popovers share the top layer with dialogs, avoiding hidden notifications.
    afterRenderEffect(() => {
      const messages = this.snackbar.messages();
      const element = this.container()?.nativeElement;
      if (!element) return;
      if (messages.length) {
        if (element.matches(':popover-open')) element.hidePopover();
        element.showPopover();
      } else if (element.matches(':popover-open')) element.hidePopover();
    });
  }

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
