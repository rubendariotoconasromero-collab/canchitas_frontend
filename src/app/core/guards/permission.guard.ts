import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const permissionGuard: CanActivateChildFn = route => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.me().pipe(
    map(() => {
      if (!route.data['permission'] || auth.can(route.data['permission'], !!route.data['global'])) return true;
      if (route.data['permission'] === 'dashboard.ver') {
        if (auth.can('reservas.ver')) return router.createUrlTree(['/agenda']);
        if (auth.can('caja.ver')) return router.createUrlTree(['/caja']);
        if (auth.can('clientes.ver')) return router.createUrlTree(['/clientes']);
        if (auth.can('solicitudes.ver')) return router.createUrlTree(['/solicitudes']);
        const first = ['usuarios', 'roles', 'permisos', 'canchas', 'deportes', 'sucursales', 'politicas', 'negocio'].find(resource => auth.can(resource + '.ver'));
        if (first) return router.createUrlTree(['/' + first]);
      }
      return router.createUrlTree(['/sin-acceso']);
    }),
    catchError(error => {
      if (error.status === 401) auth.clearSession();
      return of(router.createUrlTree([error.status === 401 ? '/login' : '/sin-acceso']));
    }),
  );
};
