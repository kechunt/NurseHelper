import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, finalize, shareReplay, tap } from 'rxjs';

const TTL_MS = 10_000;
const cache = new Map<string, { expiresAt: number; response: HttpResponse<unknown> }>();
const inFlight = new Map<string, Observable<HttpEvent<unknown>>>();

function cacheable(url: string): boolean {
  return url.includes('/api/') &&
    !url.includes('/auth/') &&
    !url.includes('/health') &&
    !url.includes('/notifications');
}

export const requestCacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) cache.clear();
    return next(req);
  }
  if (!cacheable(req.urlWithParams) || req.headers.has('X-Cache-Skip')) return next(req);

  const key = req.urlWithParams;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return new Observable((subscriber) => {
      subscriber.next(cached.response.clone());
      subscriber.complete();
    });
  }
  cache.delete(key);

  const pending = inFlight.get(key);
  if (pending) return pending;
  const request = next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cache.set(key, { expiresAt: Date.now() + TTL_MS, response: event.clone() });
      }
    }),
    finalize(() => inFlight.delete(key)),
    shareReplay({ bufferSize: 1, refCount: false })
  );
  inFlight.set(key, request);
  return request;
};
