import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { adminGuard, supervisorGuard, pharmacyGuard, nurseGuard } from './guards/auth.guard';

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
    canActivate: [nurseGuard],
  },
  {
    path: 'pharmacy',
    loadComponent: () =>
      import('./components/pharmacy-dashboard/pharmacy-dashboard.component').then((m) => m.PharmacyDashboardComponent),
    canActivate: [pharmacyGuard],
  },
  {
    path: 'asistencia',
    loadComponent: () =>
      import('./components/pharmacy-attendance-page/pharmacy-attendance-page.component').then(
        (m) => m.PharmacyAttendancePageComponent
      ),
    canActivate: [pharmacyGuard],
  },
  {
    path: 'use-case-diagram',
    loadComponent: () =>
      import('./components/use-case-diagram/use-case-diagram.component').then((m) => m.UseCaseDiagramComponent),
    canActivate: [adminGuard],
  },
  { path: 'dashboard', redirectTo: 'nurse-dashboard', pathMatch: 'full' },
];
