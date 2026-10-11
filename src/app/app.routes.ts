import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { NoAccessComponent } from './features/access/no-access.component';
import { CatalogPageComponent } from './features/catalogo/catalog-page.component';
import { CanchaDetailComponent } from './features/catalogo/cancha-detail.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { LoginComponent } from './features/auth/login/login.component';
import { PermisosComponent } from './features/permisos/permisos.component';
import { RolesComponent } from './features/roles/roles.component';
import { UsuariosComponent } from './features/usuarios/usuarios.component';

export const routes: Routes = [
  { path: 'sin-acceso', component: NoAccessComponent, canActivate: [authGuard] },
  {
    path: 'login',
    component: AuthLayoutComponent,
    children: [{ path: '', component: LoginComponent }],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'clientes', loadComponent: () => import('./features/reservas/clientes.component').then(m => m.ClientesComponent), data: {permission:'clientes.ver'} },
      { path: 'agenda', loadComponent: () => import('./features/reservas/agenda.component').then(m => m.AgendaComponent), data: {permission:'reservas.ver'} },
      { path: 'caja', loadComponent: () => import('./features/caja/caja.component').then(m => m.CajaComponent), data: {permission:'caja.ver'} },
      { path: 'administracion-cajas', loadComponent: () => import('./features/caja/cajas-admin.component').then(m => m.CajasAdminComponent), data: {permission:'caja.configurar',global:true} },
      { path: 'negocio', component: CatalogPageComponent, data: {permission:'negocio.ver',catalog:'negocios'} },
      { path: 'sucursales', component: CatalogPageComponent, data: {permission:'sucursales.ver',catalog:'sucursales'} },
      { path: 'deportes', component: CatalogPageComponent, data: {permission:'deportes.ver',catalog:'deportes'} },
      { path: 'canchas', component: CatalogPageComponent, data: {permission:'canchas.ver',catalog:'canchas'} },
      { path: 'canchas/:id', component: CanchaDetailComponent, data: {permission:'canchas.ver'} },
      { path: 'politicas', component: CatalogPageComponent, data: {permission:'politicas.ver',catalog:'politicas'} },
      { path: 'dashboard', component: DashboardComponent, data: { permission: 'dashboard.ver' } },
      { path: 'usuarios', component: UsuariosComponent, data: { permission: 'usuarios.ver' } },
      { path: 'roles', component: RolesComponent, data: { permission: 'roles.ver' } },
      { path: 'permisos', component: PermisosComponent, data: { permission: 'permisos.ver' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
