import { Injectable, signal } from '@angular/core';

export type SnackbarType = 'success' | 'error' | 'info' | 'warning';

export interface SnackbarMessage {
  id: number;
  message: string;
  type: SnackbarType;
}

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private counter = 0;
  readonly messages = signal<SnackbarMessage[]>([]);

  show(message: string, type: SnackbarType = 'info', durationMs = 3500): number {
    const id = ++this.counter;
    this.messages.update((items) => [...items, { id, message, type }]);
    setTimeout(() => this.dismiss(id), durationMs);
    return id;
  }

  success(message: string): number {
    return this.show(message?.trim() || 'Operacion completada correctamente.', 'success', 4500);
  }

  error(message: string): void {
    this.show(message, 'error', 5000);
  }

  dismiss(id: number): void {
    this.messages.update((items) => items.filter((item) => item.id !== id));
  }
}
