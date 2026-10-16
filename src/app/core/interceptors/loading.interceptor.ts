import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { defer, finalize } from 'rxjs';
import { API_BASE_URL } from '../constants/api-endpoints';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_BASE_URL + '/')) return next(request);
  const loading = inject(LoadingService);
  return defer(() => {
    const finish = loading.begin(request.method);
    // Deferring next also releases the indicator if an interceptor throws synchronously.
    return defer(() => next(request)).pipe(finalize(finish));
  });
};
