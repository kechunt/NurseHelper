import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { SupervisorDashboardComponent } from './components/supervisor-dashboard/supervisor-dashboard.component';
import { NurseDashboardComponent } from './components/nurse-dashboard/nurse-dashboard.component';
import { PharmacyDashboardComponent } from './components/pharmacy-dashboard/pharmacy-dashboard.component';
import { adminGuard, authGuard, supervisorGuard, pharmacyGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [adminGuard] },
  { path: 'supervisor', component: SupervisorDashboardComponent, canActivate: [supervisorGuard] },
  { path: 'nurse-dashboard', component: NurseDashboardComponent, canActivate: [authGuard] },
  { path: 'pharmacy', component: PharmacyDashboardComponent, canActivate: [pharmacyGuard] },
  { path: 'dashboard', redirectTo: 'nurse-dashboard', pathMatch: 'full' }, // Redirect antigua ruta
];
