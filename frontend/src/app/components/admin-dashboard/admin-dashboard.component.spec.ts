import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AuthService } from '../../services/auth.service';
import type { User } from '../../services/auth.service';

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

  it('onAdminTabKeydown con ArrowRight cambia a la siguiente pestaña', () => {
    const c = fixture.componentInstance;
    expect(c.activeTab).toBe('overview');
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    spyOn(ev, 'preventDefault');
    c.onAdminTabKeydown(ev, 'overview');
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(c.activeTab).toBe('users');
  });

  it('onAdminTabKeydown con End activa la última pestaña', () => {
    const c = fixture.componentInstance;
    const ev = new KeyboardEvent('keydown', { key: 'End' });
    spyOn(ev, 'preventDefault');
    c.onAdminTabKeydown(ev, 'overview');
    expect(c.activeTab).toBe('schedules');
  });

  it('onAdminTabKeydown ignora teclas no gestionadas', () => {
    const c = fixture.componentInstance;
    c.setActiveTab('overview');
    const ev = new KeyboardEvent('keydown', { key: 'a' });
    spyOn(ev, 'preventDefault');
    c.onAdminTabKeydown(ev, 'overview');
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });
});
