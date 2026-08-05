import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { SupervisorDashboardComponent } from './supervisor-dashboard.component';
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

describe('SupervisorDashboardComponent', () => {
  const SUPERVISOR_USER: User = {
    id: 2,
    username: 'supervisor',
    email: 's@b.c',
    firstName: 'Sue',
    lastName: 'Per',
    role: 'supervisor',
  };

  let fixture: ComponentFixture<SupervisorDashboardComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    localStorage.removeItem('supervisor-dashboard-active-tab-v2');

    const authMock = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(true),
      currentUser: signal<User | null>(SUPERVISOR_USER),
      logout: jasmine.createSpy('logout'),
    };

    await TestBed.configureTestingModule({
      imports: [SupervisorDashboardComponent, HttpClientTestingModule],
      providers: [provideRouter([]), { provide: AuthService, useValue: authMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(SupervisorDashboardComponent);
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('setActiveTab actualiza el estado de pestañas', () => {
    const c = fixture.componentInstance;
    c.setActiveTab('backups');
    expect(c.tabState.activeTab()).toBe('backups');
    expect(localStorage.getItem('supervisor-dashboard-active-tab-v2')).toBe('backups');
  });

  it('expone textos del shell localizables', () => {
    const c = fixture.componentInstance;
    expect(c.supervisorShellDashboardTitle).toContain('supervisión');
    expect(c.supervisorShellRoleDisplayLabel).toContain('Supervisor');
    expect(c.supervisorHamburgerOpenNavAriaLabel.length).toBeGreaterThan(0);
  });

  it('hamburguesa del layout móvil: id estable #supervisor-shell-nav-hamburger-btn', () => {
    const btn = fixture.nativeElement.querySelector(
      '#supervisor-shell-nav-hamburger-btn'
    ) as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
    expect(btn?.classList.contains('nav-hamburger')).toBeTrue();
  });
});
