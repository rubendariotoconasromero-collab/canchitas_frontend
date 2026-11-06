import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
export const routes: Routes = [
  { path: 'sin-acceso', loadComponent: () => import('./features/access/no-access.component').then(m => m.NoAccessComponent), canActivate: [authGuard] },
  {
    path: 'login',
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) }],
  },
  {
    path: '', loadComponent: () => import('./features/publico/public-layout.component').then(m => m.PublicLayoutComponent),
    children: [
      {path:'',pathMatch:'full',loadComponent:()=>import('./features/publico/public-home.component').then(m=>m.PublicHomeComponent)},
      {path:'espacios/:id',loadComponent:()=>import('./features/publico/public-court.component').then(m=>m.PublicCourtComponent)},
      {path:'mis-solicitudes',loadComponent:()=>import('./features/publico/public-history.component').then(m=>m.PublicHistoryComponent)},
      {path:'mis-solicitudes/:codigo',loadComponent:()=>import('./features/publico/public-tracking.component').then(m=>m.PublicTrackingComponent),data:{publicHistory:true}},
      {path:'seguimiento',loadComponent:()=>import('./features/publico/public-tracking.component').then(m=>m.PublicTrackingComponent)},
      {path:'seguimiento/:codigo',loadComponent:()=>import('./features/publico/public-tracking.component').then(m=>m.PublicTrackingComponent)},
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
    children: [
      { path: 'solicitudes', loadComponent: () => import('./features/reservas/solicitudes.component').then(m => m.SolicitudesComponent), data: {permission:'solicitudes.ver'} },
      { path: 'clientes', loadComponent: () => import('./features/reservas/clientes.component').then(m => m.ClientesComponent), data: {permission:'clientes.ver'} },
      { path: 'agenda', loadComponent: () => import('./features/reservas/agenda.component').then(m => m.AgendaComponent), data: {permission:'reservas.ver'} },
      { path: 'caja', loadComponent: () => import('./features/caja/caja.component').then(m => m.CajaComponent), data: {permission:'caja.ver'} },
      { path: 'administracion-cajas', loadComponent: () => import('./features/caja/cajas-admin.component').then(m => m.CajasAdminComponent), data: {permission:'caja.configurar',global:true} },
      { path: 'negocio', loadComponent: () => import('./features/catalogo/catalog-page.component').then(m => m.CatalogPageComponent), data: {permission:'negocio.ver',catalog:'negocios'} },
      { path: 'contenido-web', loadComponent: () => import('./features/contenido-web/content-web.component').then(m => m.ContentWebComponent), data: {permission:'contenido_web.ver',global:true} },
      { path: 'sucursales', loadComponent: () => import('./features/catalogo/catalog-page.component').then(m => m.CatalogPageComponent), data: {permission:'sucursales.ver',catalog:'sucursales'} },
      { path: 'deportes', loadComponent: () => import('./features/catalogo/catalog-page.component').then(m => m.CatalogPageComponent), data: {permission:'deportes.ver',catalog:'deportes'} },
      { path: 'canchas', loadComponent: () => import('./features/catalogo/catalog-page.component').then(m => m.CatalogPageComponent), data: {permission:'canchas.ver',catalog:'canchas'} },
      { path: 'canchas/:id', loadComponent: () => import('./features/catalogo/cancha-detail.component').then(m => m.CanchaDetailComponent), data: {permission:'canchas.ver'} },
      { path: 'politicas', loadComponent: () => import('./features/catalogo/catalog-page.component').then(m => m.CatalogPageComponent), data: {permission:'politicas.ver',catalog:'politicas'} },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent), data: { permission: 'dashboard.ver' } },
      { path: 'reportes', loadComponent: () => import('./features/reportes/reportes.component').then(m => m.ReportesComponent), data: {permission:'reportes.ver'} },
      { path: 'auditoria', loadComponent: () => import('./features/reportes/auditoria.component').then(m => m.AuditoriaComponent), data: {permission:'auditoria.ver',global:true} },
      { path: 'usuarios', loadComponent: () => import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent), data: { permission: 'usuarios.ver' } },
      { path: 'roles', loadComponent: () => import('./features/roles/roles.component').then(m => m.RolesComponent), data: { permission: 'roles.ver' } },
      { path: 'permisos', loadComponent: () => import('./features/permisos/permisos.component').then(m => m.PermisosComponent), data: { permission: 'permisos.ver' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
