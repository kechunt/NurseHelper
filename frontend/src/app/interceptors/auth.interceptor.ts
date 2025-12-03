import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

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

  // Logging para debugging
  console.log(`🌐 ${req.method} ${req.url}`);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Manejo de errores mejorado
      if (error.status === 0) {
        console.error('❌ Error de conexión:', 'No se puede conectar al servidor. Verifica la URL del backend.');
      } else if (error.status === 401) {
        console.warn('⚠️ No autorizado:', 'Token inválido o expirado');
        // Opcional: logout automático si el token es inválido
        // authService.logout();
      } else if (error.status === 403) {
        console.error('🚫 Acceso denegado:', error.message);
      } else if (error.status >= 500) {
        console.error('🔥 Error del servidor:', error.message);
      }
      
      return throwError(() => error);
    })
  );
};

