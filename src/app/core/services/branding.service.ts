import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { API_BASE_URL } from '../constants/api-endpoints';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly http = inject(HttpClient);
  private readonly title = inject(Title);
  readonly name = signal('Soccer Real Madrid');

  load(): void {
    this.title.setTitle(this.name());
    this.http.get<{ nombre_comercial: string }>(`${API_BASE_URL}/publico/marca/`).subscribe({
      next: (business) => {
        this.name.set(business.nombre_comercial.trim() || 'Soccer Real Madrid');
        this.title.setTitle(this.name());
      },
      error: () => {},
    });
  }
}
