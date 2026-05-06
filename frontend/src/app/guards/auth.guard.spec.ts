import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { adminGuard, authGuard, pharmacyGuard, supervisorGuard } from './auth.guard';
import { AuthService, type User } from '../services/auth.service';

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

function runGuard(guard: CanActivateFn): boolean {
  return TestBed.runInInjectionContext(() => guard(route, state) as boolean);
}

interface AuthMock {
  isAuthenticated: jasmine.Spy;
  currentUser: jasmine.Spy;
}

interface RouterMock {
  navigate: jasmine.Spy;
}

function configureMocks(): { auth: AuthMock; router: RouterMock } {
  const auth: AuthMock = {
    isAuthenticated: jasmine.createSpy('isAuthenticated'),
    currentUser: jasmine.createSpy('currentUser'),
  };
  const router: RouterMock = {
    navigate: jasmine.createSpy('navigate'),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: router },
    ],
  });
  return { auth, router };
}

describe('authGuard', () => {
  it('permite acceso si hay sesión', () => {
    const { auth } = configureMocks();
    auth.isAuthenticated.and.returnValue(true);
    expect(runGuard(authGuard)).toBe(true);
  });

  it('redirige a login sin sesión', () => {
    const { auth, router } = configureMocks();
    auth.isAuthenticated.and.returnValue(false);
    expect(runGuard(authGuard)).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});

function minimalUser(role: User['role']): User {
  return {
    username: 'u',
    email: 'u@u.com',
    firstName: 'U',
    lastName: 'U',
    role,
  };
}

describe('role guards (admin / supervisor / pharmacy)', () => {
  it('redirige a login si no hay sesión', () => {
    const { auth, router } = configureMocks();
    auth.isAuthenticated.and.returnValue(false);
    expect(runGuard(adminGuard)).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('adminGuard permite solo admin', () => {
    const { auth } = configureMocks();
    auth.isAuthenticated.and.returnValue(true);
    auth.currentUser.and.returnValue(minimalUser('admin'));
    expect(runGuard(adminGuard)).toBe(true);
  });

  it('adminGuard envía otros roles a su panel por defecto', () => {
    const { auth, router } = configureMocks();
    auth.isAuthenticated.and.returnValue(true);
    auth.currentUser.and.returnValue(minimalUser('nurse'));
    expect(runGuard(adminGuard)).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/nurse-dashboard']);
  });

  it('supervisorGuard permite supervisor', () => {
    const { auth } = configureMocks();
    auth.isAuthenticated.and.returnValue(true);
    auth.currentUser.and.returnValue(minimalUser('supervisor'));
    expect(runGuard(supervisorGuard)).toBe(true);
  });

  it('pharmacyGuard permite farmacia', () => {
    const { auth } = configureMocks();
    auth.isAuthenticated.and.returnValue(true);
    auth.currentUser.and.returnValue(minimalUser('pharmacy'));
    expect(runGuard(pharmacyGuard)).toBe(true);
  });

  it('si hay sesión pero usuario null, redirige a login', () => {
    const { auth, router } = configureMocks();
    auth.isAuthenticated.and.returnValue(true);
    auth.currentUser.and.returnValue(null);
    expect(runGuard(adminGuard)).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
