import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api-endpoints';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('canchitas_token');
  const api = req.url.startsWith(API_BASE_URL + '/');
  if (!api || req.url === API_ENDPOINTS.login || req.url.startsWith(`${API_BASE_URL}/publico/`)) {
    return next(req);
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(token ? req.clone({
    setHeaders: {
      Authorization: `Token ${token}`,
    },
  }) : req).pipe(catchError(error => {
    if (error.status === 401) {
      auth.clearSession();
      router.navigate(['/login']);
    }
    if (error.status === 403 && req.url !== API_ENDPOINTS.me) {
      auth.me().subscribe({ error: () => {} });
    }
    return throwError(() => error);
  }));
};
