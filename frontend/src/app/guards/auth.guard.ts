import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService, User, defaultDashboardPath } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

function roleGuard(allowedRoles: User['role'][]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    const user = authService.currentUser();
    if (user && allowedRoles.includes(user.role)) {
      return true;
    }

    router.navigate([user ? defaultDashboardPath(user.role) : '/login']);
    return false;
  };
}

export const adminGuard = roleGuard(['admin']);
export const supervisorGuard = roleGuard(['supervisor']);
export const pharmacyGuard = roleGuard(['pharmacy']);
