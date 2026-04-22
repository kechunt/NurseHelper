/**
 * Patrón de rutas con lazy `loadComponent` y guards.
 * Fuente: frontend/src/app/app.routes.ts
 */
import { Routes } from '@angular/router';
// import { authGuard } from './guards/auth.guard';

export const routesExample: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'mi-ruta',
    loadComponent: () =>
      import('./components/mi-feature/mi-feature.component').then((m) => m.MiFeatureComponent),
    // canActivate: [authGuard],
  },
];
