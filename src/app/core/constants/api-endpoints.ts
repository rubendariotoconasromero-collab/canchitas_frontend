import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl;

export const API_ENDPOINTS = {
  login: `${API_BASE_URL}/login/`,
  logout: `${API_BASE_URL}/logout/`,
  me: `${API_BASE_URL}/me/`,
  usuarios: `${API_BASE_URL}/usuarios/`,
  usuario: (id: number) => `${API_BASE_URL}/usuarios/${id}/`,
  usuarioAsignaciones: (id: number) => `${API_BASE_URL}/usuarios/${id}/asignaciones/`,
  usuarioSyncAsignaciones: (id: number) => `${API_BASE_URL}/usuarios/${id}/asignaciones/sync/`,
  sucursales: `${API_BASE_URL}/sucursales/`,
  roles: `${API_BASE_URL}/roles/`,
  rol: (id: number) => `${API_BASE_URL}/roles/${id}/`,
  rolPermisos: (id: number) => `${API_BASE_URL}/roles/${id}/permisos/`,
  rolSyncPermisos: (id: number) => `${API_BASE_URL}/roles/${id}/permisos/sync/`,
  permisos: `${API_BASE_URL}/permisos/`,
  permiso: (id: number) => `${API_BASE_URL}/permisos/${id}/`,
  rolPermisosCatalogo: `${API_BASE_URL}/rol-permisos/`,
};
