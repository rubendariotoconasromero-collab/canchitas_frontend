import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../core/constants/api-endpoints';
import { Permiso } from '../../core/models/auth.model';

export interface PermisoPayload {
  nombre: string;
  descripcion?: string;
  estado?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PermisoService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(API_ENDPOINTS.permisos);
  }

  crear(payload: PermisoPayload): Observable<{ data: Permiso; message: string }> {
    return this.http.post<{ data: Permiso; message: string }>(API_ENDPOINTS.permisos, payload);
  }

  actualizar(id: number, payload: PermisoPayload): Observable<{ data: Permiso; message: string }> {
    return this.http.put<{ data: Permiso; message: string }>(API_ENDPOINTS.permiso(id), payload);
  }

  cambiarEstado(id: number): Observable<{ data: Permiso; message: string }> {
    return this.http.delete<{ data: Permiso; message: string }>(API_ENDPOINTS.permiso(id));
  }
}
