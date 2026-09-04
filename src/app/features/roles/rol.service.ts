import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../core/constants/api-endpoints';
import { Permiso, Rol } from '../../core/models/auth.model';

export interface RolPayload {
  nombre: string;
  descripcion?: string;
  estado?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RolService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Rol[]> {
    return this.http.get<Rol[]>(API_ENDPOINTS.roles);
  }

  crear(payload: RolPayload): Observable<{ data: Rol; message: string }> {
    return this.http.post<{ data: Rol; message: string }>(API_ENDPOINTS.roles, payload);
  }

  actualizar(id: number, payload: RolPayload): Observable<{ data: Rol; message: string }> {
    return this.http.put<{ data: Rol; message: string }>(API_ENDPOINTS.rol(id), payload);
  }

  cambiarEstado(id: number): Observable<{ data: Rol; message: string }> {
    return this.http.delete<{ data: Rol; message: string }>(API_ENDPOINTS.rol(id));
  }

  permisos(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(API_ENDPOINTS.permisos);
  }

  getPermisos(id: number): Observable<{ data: number[] }> {
    return this.http.get<{ data: number[] }>(API_ENDPOINTS.rolPermisos(id));
  }

  syncPermisos(id: number, permisoIds: number[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API_ENDPOINTS.rolSyncPermisos(id), {
      permiso_ids: permisoIds,
    });
  }
}
