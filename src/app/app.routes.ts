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
import { PublicLayoutComponent } from './features/publico/public-layout.component';

export const routes: Routes = [
  { path: 'sin-acceso', component: NoAccessComponent, canActivate: [authGuard] },
  {
    path: 'login',
    component: AuthLayoutComponent,
    children: [{ path: '', component: LoginComponent }],
  },
  {
    path: '', component: PublicLayoutComponent,
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
    component: MainLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
    children: [
      { path: 'solicitudes', loadComponent: () => import('./features/reservas/solicitudes.component').then(m => m.SolicitudesComponent), data: {permission:'solicitudes.ver'} },
      { path: 'clientes', loadComponent: () => import('./features/reservas/clientes.component').then(m => m.ClientesComponent), data: {permission:'clientes.ver'} },
      { path: 'agenda', loadComponent: () => import('./features/reservas/agenda.component').then(m => m.AgendaComponent), data: {permission:'reservas.ver'} },
      { path: 'caja', loadComponent: () => import('./features/caja/caja.component').then(m => m.CajaComponent), data: {permission:'caja.ver'} },
      { path: 'administracion-cajas', loadComponent: () => import('./features/caja/cajas-admin.component').then(m => m.CajasAdminComponent), data: {permission:'caja.configurar',global:true} },
      { path: 'negocio', component: CatalogPageComponent, data: {permission:'negocio.ver',catalog:'negocios'} },
      { path: 'contenido-web', loadComponent: () => import('./features/contenido-web/content-web.component').then(m => m.ContentWebComponent), data: {permission:'contenido_web.ver',global:true} },
      { path: 'sucursales', component: CatalogPageComponent, data: {permission:'sucursales.ver',catalog:'sucursales'} },
      { path: 'deportes', component: CatalogPageComponent, data: {permission:'deportes.ver',catalog:'deportes'} },
      { path: 'canchas', component: CatalogPageComponent, data: {permission:'canchas.ver',catalog:'canchas'} },
      { path: 'canchas/:id', component: CanchaDetailComponent, data: {permission:'canchas.ver'} },
      { path: 'politicas', component: CatalogPageComponent, data: {permission:'politicas.ver',catalog:'politicas'} },
      { path: 'dashboard', component: DashboardComponent, data: { permission: 'dashboard.ver' } },
      { path: 'reportes', loadComponent: () => import('./features/reportes/reportes.component').then(m => m.ReportesComponent), data: {permission:'reportes.ver'} },
      { path: 'auditoria', loadComponent: () => import('./features/reportes/auditoria.component').then(m => m.AuditoriaComponent), data: {permission:'auditoria.ver',global:true} },
      { path: 'usuarios', component: UsuariosComponent, data: { permission: 'usuarios.ver' } },
      { path: 'roles', component: RolesComponent, data: { permission: 'roles.ver' } },
      { path: 'permisos', component: PermisosComponent, data: { permission: 'permisos.ver' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
