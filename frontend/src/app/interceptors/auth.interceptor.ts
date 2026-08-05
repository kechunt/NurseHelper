import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, defer, retry, switchMap, throwError, timeout, timer } from 'rxjs';
import { AuthService } from '../services/auth.service';

const DEFAULT_TIMEOUT = 15_000;
const MAX_RETRIES = 2;

export const authInterceptor: HttpInterceptorFn = (originalRequest, next) => {
  const authService = inject(AuthService);
  const lifecycleRequest =
    originalRequest.url.includes('/auth/login') ||
    originalRequest.url.includes('/auth/refresh') ||
    originalRequest.url.includes('/auth/logout');

  const customTimeout = originalRequest.headers.get('X-Request-Timeout');
  const timeoutValue = customTimeout ? Number.parseInt(customTimeout, 10) : DEFAULT_TIMEOUT;
  let headers = customTimeout
    ? originalRequest.headers.delete('X-Request-Timeout')
    : originalRequest.headers;
  const token = authService.getToken();
  if (token) headers = headers.set('Authorization', `Bearer ${token}`);
  const request = originalRequest.clone({ headers, withCredentials: true });
  let attempt = 0;

  return defer(() => {
    const outgoing = attempt > 0 && !request.headers.has('X-Skip-Loading')
      ? request.clone({ setHeaders: { 'X-Skip-Loading': 'true' } })
      : request;
    attempt += 1;
    return next(outgoing);
  }).pipe(
    timeout(timeoutValue),
    retry({
      count: MAX_RETRIES,
      delay: (error: HttpErrorResponse, retryCount) =>
        error.status === 0 && retryCount <= MAX_RETRIES
          ? timer(1_000 * retryCount)
          : throwError(() => error),
    }),
    catchError((error: HttpErrorResponse | any) => {
      const isTimeout = error.name === 'TimeoutError';
      if (error.status === 0 || isTimeout) {
        return throwError(() => new HttpErrorResponse({
          error: { message: 'No se puede establecer conexión con el servidor.' },
          status: 0,
          statusText: 'Connection Error',
          url: request.url,
        }));
      }

      if (error.status === 401 && !lifecycleRequest) {
        return authService.refreshSession().pipe(
          switchMap(() => {
            const refreshedToken = authService.getToken();
            const retried = refreshedToken
              ? request.clone({ setHeaders: { Authorization: `Bearer ${refreshedToken}` } })
              : request;
            return next(retried);
          }),
          catchError((refreshError) => {
            authService.clearSession();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
