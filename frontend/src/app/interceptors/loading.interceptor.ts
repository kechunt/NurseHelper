import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

function shouldSkipLoading(url: string): boolean {
  return (
    url.includes('/health') ||
    url.includes('/health-basic') ||
    url.includes('/api-docs') ||
    url.includes('/notifications')
  );
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has('X-Skip-Loading') || shouldSkipLoading(req.url)) {
    return next(req);
  }

  const loadingService = inject(LoadingService);
  loadingService.start();

  return next(req).pipe(finalize(() => loadingService.stop()));
};
