import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../core/constants/api-endpoints';
import { Rol, Sucursal, Usuario } from '../../core/models/auth.model';

export interface UsuarioPayload {
  nombre: string;
  correo: string;
  password?: string;
  estado?: boolean;
  sucursal_id?: number | null;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(API_ENDPOINTS.usuarios);
  }

  crear(payload: UsuarioPayload): Observable<{ data: Usuario; message: string }> {
    return this.http.post<{ data: Usuario; message: string }>(API_ENDPOINTS.usuarios, payload);
  }

  actualizar(id: number, payload: UsuarioPayload): Observable<{ data: Usuario; message: string }> {
    return this.http.put<{ data: Usuario; message: string }>(API_ENDPOINTS.usuario(id), payload);
  }

  cambiarEstado(id: number): Observable<{ data: Usuario; message: string }> {
    return this.http.delete<{ data: Usuario; message: string }>(API_ENDPOINTS.usuario(id));
  }

  sucursales(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(API_ENDPOINTS.sucursales);
  }

  roles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(API_ENDPOINTS.roles);
  }

  getAsignaciones(id: number): Observable<{ data: number[] }> {
    return this.http.get<{ data: number[] }>(API_ENDPOINTS.usuarioAsignaciones(id));
  }

  syncAsignaciones(id: number, rolPermisoIds: number[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API_ENDPOINTS.usuarioSyncAsignaciones(id), {
      rol_permiso_ids: rolPermisoIds,
    });
  }
}
