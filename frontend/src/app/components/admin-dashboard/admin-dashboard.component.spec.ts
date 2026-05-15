import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AuthService } from '../../services/auth.service';
import type { User } from '../../services/auth.service';

function ensureLocalizeShim(): void {
  const g = globalThis as any;
  if (typeof g.$localize === 'function') {
    return;
  }
  g.$localize = (strings: TemplateStringsArray, ...expr: unknown[]) =>
    strings.reduce((acc, rawPart, idx) => {
      const part = idx === 0 ? rawPart.replace(/^:.*?:/, '') : rawPart;
      return acc + part + (idx < expr.length ? String(expr[idx]) : '');
    }, '');
}

describe('AdminDashboardComponent', () => {
  const ADMIN_USER: User = {
    id: 1,
    username: 'admin',
    email: 'a@b.c',
    firstName: 'Ada',
    lastName: 'Min',
    role: 'admin',
  };

  let fixture: ComponentFixture<AdminDashboardComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    const key = 'admin-dashboard-active-tab-v1';
    localStorage.removeItem(key);

    const authMock = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
      currentUser: signal<User | null>(ADMIN_USER),
      logout: jasmine.createSpy('logout'),
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({}) },
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('expone textos localizados del shell admin', () => {
    const c = fixture.componentInstance;
    expect(c.adminShellDashboardTitle.length).toBeGreaterThan(0);
    expect(c.adminShellRoleDisplayLabel.length).toBeGreaterThan(0);
    expect(c.adminHamburgerOpenNavAriaLabel.length).toBeGreaterThan(0);
  });

  it('hamburguesa del layout móvil: id estable #admin-shell-nav-hamburger-btn', () => {
    const btn = fixture.nativeElement.querySelector('#admin-shell-nav-hamburger-btn') as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
    expect(btn?.tagName.toLowerCase()).toBe('button');
  });
});
