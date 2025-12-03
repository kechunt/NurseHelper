import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const user = authService.currentUser();
    if (user?.role === 'admin') {
      return true;
    }
    router.navigate(['/nurse-dashboard']);
    return false;
  }

  router.navigate(['/login']);
  return false;
};

export const supervisorGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const user = authService.currentUser();
    if (user?.role === 'supervisor') {
      return true;
    }
    router.navigate(['/nurse-dashboard']);
    return false;
  }

  router.navigate(['/login']);
  return false;
};

export const pharmacyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const user = authService.currentUser();
    if (user?.role === 'pharmacy') {
      return true;
    }
    router.navigate(['/nurse-dashboard']);
    return false;
  }

  router.navigate(['/login']);
  return false;
};

