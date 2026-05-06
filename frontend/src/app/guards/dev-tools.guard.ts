import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { environment } from '../../environments/environment';

/** Bloquea rutas de desarrollo/QA (p. ej. catálogo de diseño) cuando `environment.production` es true. */
export const designCatalogGuard: CanActivateFn = () => {
  if (!environment.production) {
    return true;
  }
  inject(Router).navigate(['/login']);
  return false;
};
