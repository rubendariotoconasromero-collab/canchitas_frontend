import { ModalComponent } from '../modal/modal.component';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  ViewEncapsulation,
  input,
} from '@angular/core';
import { ButtonComponent } from '../button/button.component';

@Component({
  styleUrl: './confirmation-modal.component.css',
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [ModalComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-modal [open]="open()" [title]="title()" icon="help" size="small" [busy]="false" (closed)="cancelled.emit()">
          <div class="modal-body cm-body">
            <div class="cm-icon" [class.cm-danger]="variant() === 'danger'">
              <span class="material-symbols-outlined">{{ variant() === 'danger' ? 'warning' : 'help' }}</span>
            </div>
            
            <p class="cm-msg">{{ message() }}</p>
          </div>
          <div class="modal-footer">
            <app-button variant="outline-secondary" (clicked)="cancelled.emit()">{{ cancelLabel() }}</app-button>
            <app-button [variant]="variant() === 'danger' ? 'danger' : 'primary'" (clicked)="confirmed.emit()">
              {{ confirmLabel() }}
            </app-button>
          </div>
    </app-modal>
  `,
})
export class ConfirmationModalComponent {
  open = input(false);
  title = input('Confirmar accion');
  message = input('Esta accion puede afectar datos del sistema.');
  confirmLabel = input('Confirmar');
  cancelLabel = input('Cancelar');
  variant = input<'danger' | 'warning' | 'primary'>('warning');

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
