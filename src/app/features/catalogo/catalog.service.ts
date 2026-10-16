import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../core/constants/api-endpoints';
import { CatalogRow } from './catalog.config';
import { tap } from 'rxjs';
import { BrandingService } from '../../core/services/branding.service';

@Injectable({providedIn:'root'})
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly branding = inject(BrandingService);
  private url(endpoint: string, id?: number) { return `${API_BASE_URL}/catalogo/${endpoint}/${id ? id + '/' : ''}`; }
  list(endpoint: string, filters: Record<string, any> = {}) {
    return this.http.get<CatalogRow[]>(this.url(endpoint), {params: new HttpParams({fromObject: filters})});
  }
  get(endpoint: string, id: number) { return this.http.get<CatalogRow>(this.url(endpoint,id)); }
  save(endpoint: string, data: CatalogRow | FormData, id?: number) {
    const request = id ? this.http.patch<CatalogRow>(this.url(endpoint,id),data) : this.http.post<CatalogRow>(this.url(endpoint),data);
    return request.pipe(tap(() => {
      if (endpoint === 'negocios') this.branding.load();
    }));
  }
  deactivate(endpoint: string, id: number) { return this.http.delete(this.url(endpoint,id)); }
  uploadPhotos(data: FormData) {
    return this.http.post<CatalogRow[]>(`${this.url('fotos')}lote/`, data);
  }
  movePhoto(id: number, direction: 'subir' | 'bajar') {
    return this.http.post<CatalogRow[]>(`${this.url('fotos', id)}mover/`, {direccion: direction});
  }
  move(endpoint: string, id: number, direction: 'subir' | 'bajar') {
    return this.http.post<CatalogRow[]>(`${this.url(endpoint, id)}mover/`, {direccion: direction});
  }
  publication() {
    return this.http.get<{slides_publicados:number;pendientes:string[]}>(this.url('configuracion-web')+'publicacion/');
  }
}
