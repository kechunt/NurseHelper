import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { adminGuard, authGuard, supervisorGuard, pharmacyGuard } from './guards/auth.guard';
import { designCatalogGuard } from './guards/dev-tools.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  {
    path: 'admin',
    loadComponent: () =>
      import('./components/admin-dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'supervisor',
    loadComponent: () =>
      import('./components/supervisor-dashboard/supervisor-dashboard.component').then(
        (m) => m.SupervisorDashboardComponent
      ),
    canActivate: [supervisorGuard],
  },
  {
    path: 'nurse-dashboard',
    loadComponent: () =>
      import('./components/nurse-dashboard/nurse-dashboard.component').then((m) => m.NurseDashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'pharmacy',
    loadComponent: () =>
      import('./components/pharmacy-dashboard/pharmacy-dashboard.component').then((m) => m.PharmacyDashboardComponent),
    canActivate: [pharmacyGuard],
  },
  {
    path: 'use-case-diagram',
    loadComponent: () =>
      import('./components/use-case-diagram/use-case-diagram.component').then((m) => m.UseCaseDiagramComponent),
    canActivate: [authGuard],
  },
  /** Catálogo neumórfico para QA; deshabilitado en build de producción (`designCatalogGuard`). */
  {
    path: 'design-catalog',
    loadComponent: () =>
      import('./dev/design-catalog/design-catalog.component').then((m) => m.DesignCatalogComponent),
    canActivate: [designCatalogGuard],
  },
  /** Catálogo de iconos SVG custom (solo desarrollo). */
  {
    path: 'svg-icon-test',
    loadComponent: () =>
      import('./dev/svg-icon-test/svg-icon-test.component').then((m) => m.SvgIconTestComponent),
    canActivate: [designCatalogGuard],
  },
  { path: 'dashboard', redirectTo: 'nurse-dashboard', pathMatch: 'full' },
];
