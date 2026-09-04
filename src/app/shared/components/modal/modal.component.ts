import { ViewEncapsulation, afterRenderEffect, ChangeDetectionStrategy, Component, ElementRef, inject, input, OnDestroy, output, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
  styleUrl: './modal.component.css',
  encapsulation: ViewEncapsulation.None,
  selector: 'app-modal',
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="app-modal" [class.app-modal-wide]="size() === 'wide'"
      [class.app-modal-confirm]="size() === 'small'" [attr.aria-label]="title()"
      [attr.aria-busy]="busy()" (cancel)="onCancel($event)" (click)="onBackdrop($event)">
      <header class="modal-header">
        <h2 class="modal-title">
          @if (icon()) { <span class="material-symbols-outlined" aria-hidden="true">{{ icon() }}</span> }
          {{ title() }}
        </h2>
        <app-button size="sm" variant="outline-secondary" icon="close" title="Cerrar"
          [disabled]="busy()" (clicked)="requestClose()" />
      </header>
      <fieldset class="modal-fields" [disabled]="busy()"><ng-content /></fieldset>
      <ng-content select="[modalActions]" />
    </dialog>
  `,
  styles: [`
    :host { display: contents; }
    dialog.app-modal { margin: auto; padding: 0; border: 0; max-height: calc(100dvh - 2rem);
      width: min(500px, calc(100vw - 2rem)); overflow: auto; }
    dialog.app-modal-wide { width: min(680px, calc(100vw - 2rem)); }
    dialog.app-modal-confirm { width: min(400px, calc(100vw - 2rem)); }
    dialog::backdrop { background: rgba(16, 25, 20, .55); }
    .modal-fields { margin: 0; padding: 0; min-width: 0; border: 0; }
    .modal-header { position: sticky; top: 0; z-index: 1; }
    .modal-title { min-width: 0; overflow-wrap: anywhere; }
  `],
})
export class ModalComponent implements OnDestroy {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly icon = input('');
  readonly size = input<'normal' | 'wide' | 'small'>('normal');
  readonly busy = input(false);
  readonly closeOnBackdrop = input(true);
  readonly closeOnEscape = input(true);
  readonly closed = output<void>();
  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly document = inject(DOCUMENT);
  private previousFocus: HTMLElement | null = null;

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      // Native modal dialogs isolate background content and contain keyboard focus.
      if (this.open() && !dialog.open) {
        this.previousFocus = this.document.activeElement as HTMLElement | null;
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
        this.restoreFocus();
      }
    });
  }

  requestClose(): void {
    if (!this.busy()) this.closed.emit();
  }

  onCancel(event: Event): void {
    event.preventDefault();
    if (this.closeOnEscape()) this.requestClose();
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target !== this.dialog()?.nativeElement || !this.closeOnBackdrop()) return;
    const rect = this.dialog()!.nativeElement.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) this.requestClose();
  }

  ngOnDestroy(): void {
    this.dialog()?.nativeElement.close();
    this.restoreFocus();
  }

  private restoreFocus(): void {
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
    this.previousFocus = null;
  }
}
