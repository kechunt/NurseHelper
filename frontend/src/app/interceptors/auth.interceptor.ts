import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, timeout, retry, throwError, timer, defer } from 'rxjs';

// Timeout por defecto: 15 segundos
const DEFAULT_TIMEOUT = 15000;
// Número de reintentos para errores de red
const MAX_RETRIES = 2;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Agregar token de autenticación si existe
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Obtener timeout personalizado si existe en los headers
  const customTimeout = req.headers.get('X-Request-Timeout');
  const timeoutValue = customTimeout ? parseInt(customTimeout, 10) : DEFAULT_TIMEOUT;

  // Remover el header personalizado antes de enviar y optimizar clonación
  if (customTimeout) {
    const headers = req.headers.delete('X-Request-Timeout');
    req = req.clone({ headers });
  }

  let attempt = 0;

  return defer(() => {
    const outgoing =
      attempt > 0 && !req.headers.has('X-Skip-Loading')
        ? req.clone({ setHeaders: { 'X-Skip-Loading': 'true' } })
        : req;
    attempt += 1;
    return next(outgoing);
  }).pipe(
    // Aplicar timeout
    timeout(timeoutValue),
    // Reintentar solo para errores de red (status 0)
    retry({
      count: MAX_RETRIES,
      delay: (error: any, retryCount: number) => {
        // Solo reintentar si es error de conexión (status 0)
        if (error.status === 0 && retryCount <= MAX_RETRIES) {
          // Delay exponencial: 1s, 2s usando timer de RxJS
          const delayMs = 1000 * retryCount;
          return timer(delayMs);
        }
        return throwError(() => error);
      },
    }),
    catchError((error: HttpErrorResponse | any) => {
      // Manejo de errores mejorado
      // Verificar si es error de timeout o conexión
      const isTimeoutError =
        error.name === 'TimeoutError' || (error instanceof Error && error.name === 'TimeoutError');
      const isConnectionError = error.status === 0 || isTimeoutError;

      if (isConnectionError) {
        console.error(
          ' Error de conexión:',
          'No se puede conectar al servidor. Verifica que el backend esté funcionando.'
        );
        // Crear un error más descriptivo
        const connectionError = new HttpErrorResponse({
          error: {
            message:
              'No se puede establecer conexión con el servidor. Verifica que el backend esté corriendo en http://localhost:3000',
          },
          status: 0,
          statusText: 'Connection Error',
          url: req.url,
        });
        return throwError(() => connectionError);
      } else if (error.status === 401) {
        console.warn(' No autorizado:', 'Token inválido o expirado');
        // Opcional: redirigir al login si el token expiró
        if (req.url.includes('/auth/login') === false) {
          authService.logout();
        }
      } else if (error.status === 403) {
        console.error(' Acceso denegado:', error.message);
      } else if (error.status >= 500) {
        console.error(' Error del servidor:', error.message);
      }

      return throwError(() => error);
    })
  );
};
