import { computed, Injectable, signal } from '@angular/core';

@Injectable({providedIn: 'root'})
export class LoadingService {
  private readonly requests = signal<ReadonlyMap<number, boolean>>(new Map());
  private sequence = 0;
  readonly pending = computed(() => this.requests().size);
  readonly active = computed(() => this.pending() > 0);
  readonly message = computed(() => [...this.requests().values()].some(writing => writing)
    ? 'Procesando operacion...' : 'Cargando informacion...');

  begin(method: string): () => void {
    const id = ++this.sequence;
    this.requests.update(requests => new Map(requests).set(id, !['GET', 'HEAD', 'OPTIONS'].includes(method)));
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      this.requests.update(requests => { const next = new Map(requests); next.delete(id); return next; });
    };
  }
}
