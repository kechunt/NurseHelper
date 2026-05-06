import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { SupervisorDashboardComponent } from './supervisor-dashboard.component';
import { AuthService } from '../../services/auth.service';
import type { User } from '../../services/auth.service';

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
    localStorage.removeItem('supervisor-dashboard-active-tab-v1');

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

  it('onSupervisorTabKeydown con ArrowRight pasa a la siguiente pestaña', () => {
    const c = fixture.componentInstance;
    expect(c.activeTab).toBe('overview');
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    spyOn(ev, 'preventDefault');
    c.onSupervisorTabKeydown(ev, 'overview');
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(c.activeTab).toBe('users');
  });

  it('onSupervisorTabKeydown con End activa la última pestaña', () => {
    const c = fixture.componentInstance;
    const ev = new KeyboardEvent('keydown', { key: 'End' });
    spyOn(ev, 'preventDefault');
    c.onSupervisorTabKeydown(ev, 'overview');
    expect(c.activeTab).toBe('schedules');
  });
});
