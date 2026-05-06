import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PharmacyDashboardComponent } from './pharmacy-dashboard.component';
import { AuthService } from '../../services/auth.service';
import { PharmacyService } from '../../services/pharmacy.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationService } from '../../services/confirmation.service';
import type { User } from '../../services/auth.service';

describe('PharmacyDashboardComponent', () => {
  const PHARMACY_USER: User = {
    id: 3,
    username: 'farm',
    email: 'f@b.c',
    firstName: 'María',
    lastName: 'Farmacia',
    role: 'pharmacy',
  };

  const pagination = { page: 1, limit: 20, total: 0, totalPages: 1 };

  const pharmacyServiceMock = {
    getInventoryPaged: jasmine.createSpy('getInventoryPaged').and.returnValue(of({ data: [], pagination })),
    getInventory: jasmine.createSpy('getInventory').and.returnValue(of([])),
    getMedicationRequestsPaged: jasmine.createSpy('getMedicationRequestsPaged').and.returnValue(
      of({
        data: [],
        pagination,
        openByStatus: { pending: 0, in_preparation: 0, ready: 0 },
      })
    ),
    getDeliveryHistoryPaged: jasmine.createSpy('getDeliveryHistoryPaged').and.returnValue(
      of({
        deliveries: [],
        cancelled: [],
        pagination,
        summary: { deliveredTodayCount: 0 },
      })
    ),
  };

  const toastMock = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
    warning: jasmine.createSpy('warning'),
    info: jasmine.createSpy('info'),
  };

  const confirmationMock = {
    confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve(false)),
  };

  let fixture: ComponentFixture<PharmacyDashboardComponent>;

  beforeEach(async () => {
    localStorage.removeItem('pharmacy-dashboard-ui-v1');

    await TestBed.configureTestingModule({
      imports: [PharmacyDashboardComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: signal(PHARMACY_USER) } },
        { provide: PharmacyService, useValue: pharmacyServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: ConfirmationService, useValue: confirmationMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PharmacyDashboardComponent);
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('onPharmacyTabKeydown con ArrowRight cambia de módulo', () => {
    const c = fixture.componentInstance;
    expect(c.activeSection).toBe('requests');
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    spyOn(ev, 'preventDefault');
    c.onPharmacyTabKeydown(ev, 'requests');
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(c.activeSection).toBe('history');
  });

  it('onPharmacyTabKeydown con End activa inventario', () => {
    const c = fixture.componentInstance;
    const ev = new KeyboardEvent('keydown', { key: 'End' });
    spyOn(ev, 'preventDefault');
    c.onPharmacyTabKeydown(ev, 'requests');
    expect(c.activeSection).toBe('inventory');
  });
});
