/**
 * Equivalente a `app.config.ts` del proyecto: router, HTTP con interceptor, zona.
 * Ruta fuente: frontend/src/app/app.config.ts
 */
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

// import { routes } from './app.routes';
// import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfigExample: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // provideRouter(routes),
    // provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
