export interface Sucursal {
  id: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  estado: boolean;
}

export interface Permiso {
  id: number;
  nombre: string;
  descripcion?: string;
  estado: boolean;
  pivot?: {
    id: number;
  };
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
  estado: boolean;
  permisos?: Permiso[];
}

export interface RolPermisoUsuario {
  id: number;
  rol_permiso: {
    id: number;
    rol: Rol;
    permiso: Permiso;
  };
}

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  estado: boolean;
  sucursal?: Sucursal | null;
  roles_permisos?: RolPermisoUsuario[];
  date_joined?: string;
}

export interface AuthResponse {
  token: string;
  user: Usuario;
}
