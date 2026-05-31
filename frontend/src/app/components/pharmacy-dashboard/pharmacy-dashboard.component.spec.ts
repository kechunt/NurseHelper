import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PharmacyDashboardComponent } from './pharmacy-dashboard.component';
import { AuthService } from '../../services/auth.service';
import { PharmacyService } from '../../services/pharmacy.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationService } from '../../services/confirmation.service';
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
    getWorkShifts: jasmine.createSpy('getWorkShifts').and.returnValue(of([])),
    getPharmacyShiftAttendanceSummary: jasmine
      .createSpy('getPharmacyShiftAttendanceSummary')
      .and.returnValue(of({ shifts: [] })),
    getPharmacyShiftAttendance: jasmine.createSpy('getPharmacyShiftAttendance').and.returnValue(of([])),
    savePharmacyShiftAttendance: jasmine.createSpy('savePharmacyShiftAttendance').and.returnValue(of({ message: 'ok' })),
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
    ensureLocalizeShim();
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

  afterEach(() => {
    pharmacyServiceMock.getInventoryPaged.and.returnValue(of({ data: [], pagination }));
    pharmacyServiceMock.getMedicationRequestsPaged.and.returnValue(
      of({
        data: [],
        pagination,
        openByStatus: { pending: 0, in_preparation: 0, ready: 0 },
      })
    );
    pharmacyServiceMock.getDeliveryHistoryPaged.and.returnValue(
      of({
        deliveries: [],
        cancelled: [],
        pagination,
        summary: { deliveredTodayCount: 0 },
      })
    );
    toastMock.error.calls.reset();
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('expone textos shell y pestañas localizables', () => {
    const c = fixture.componentInstance;
    expect(c.pharmacyShellPanelTitle).toContain('Panel de Farmacia');
    expect(c.pharmacyShellNavAriaLabel).toContain('Módulos');
    expect(c.pharmacyShellTabRequestsLabel).toContain('Solicitudes');
  });

  it('expone títulos de módulo farmacia localizables', () => {
    const c = fixture.componentInstance;
    expect(c.pharmacyRequestsSectionTitle).toContain('Solicitudes');
    expect(c.pharmacyRequestFilterOptions.length).toBe(6);
    expect(c.pharmacyHistorySectionTitle).toContain('Historial');
  });

  it('paginación solicitudes: info incluye página y total', () => {
    const c = fixture.componentInstance;
    c.requestsPagination = { page: 2, limit: 20, total: 45, totalPages: 3 };
    const info = c.pharmacyRequestsPaginationInfo();
    expect(info).toContain('2');
    expect(info).toContain('3');
    expect(info).toContain('45');
    expect(c.pharmacyExportHistoryTitle).toContain('Exportar');
  });

  it('getStatusLabel y título detalle solicitud', () => {
    const c = fixture.componentInstance;
    expect(c.getStatusLabel('pending')).toContain('Pendiente');
    expect(c.requestDetailModalTitle('REQ-99')).toContain('REQ-99');
  });

  it('cabeceras de export e impresión localizables', () => {
    const c = fixture.componentInstance;
    expect(c.pharmacyExpColType).toContain('Tipo');
    expect(c.pharmacyExportKindDelivery).toContain('Entreg');
    expect(c.pharmacyPdfGeneratedPrefix).toContain('Generado');
    expect(c.pharmacyExportInventoryTitle).toContain('Inventario');
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

  it('fallo al cargar inventario: mensaje de error localizado por defecto', () => {
    pharmacyServiceMock.getInventoryPaged.and.returnValue(throwError(() => ({ error: {} })));
    const c = fixture.componentInstance;
    c.loadData();
    expect(c.inventoryError).toContain('inventario');
  });

  it('fallo al cargar solicitudes: toast y panel usan cadenas localizadas', () => {
    pharmacyServiceMock.getMedicationRequestsPaged.and.returnValue(throwError(() => ({ error: {} })));
    pharmacyServiceMock.getInventory.and.returnValue(of([]));
    const c = fixture.componentInstance;
    c.loadRequests();
    expect(toastMock.error).toHaveBeenCalled();
    expect(String(toastMock.error.calls.mostRecent().args[0])).toMatch(/solicitudes|recarga/i);
    expect(c.requestsError).toContain('solicitudes');
  });

  it('fallo al cargar historial: mensaje de error localizado por defecto', () => {
    pharmacyServiceMock.getDeliveryHistoryPaged.and.returnValue(throwError(() => ({ error: {} })));
    const c = fixture.componentInstance;
    c.loadHistory();
    expect(c.historyError).toContain('historial');
  });

  it('expone avisos localizados de alta de medicamento e inventario', () => {
    const c = fixture.componentInstance;
    expect(c.pharmacyWarnAddMedNameDosage).toContain('requeridos');
    expect(c.pharmacyToastStockMoveOk).toContain('Movimiento');
  });

  it('viewRequestDetails notifica con línea localizable', () => {
    const c = fixture.componentInstance;
    const req = {
      requestId: 'REQ-7',
      medication: 'Insulina',
      dosage: '100 UI',
      quantity: 3,
      patients: [{ patientName: 'A', bedNumber: '1', doses: [] }],
    } as any;
    c.viewRequestDetails(req);
    expect(toastMock.info).toHaveBeenCalled();
    expect(String(toastMock.info.calls.mostRecent().args[0])).toContain('REQ-7');
  });
});

describe('PharmacyDashboardComponent (sin usuario en sesión)', () => {
  const pagination = { page: 1, limit: 20, total: 0, totalPages: 1 };

  const pharmacyServiceMock = {
    getWorkShifts: jasmine.createSpy('getWorkShifts').and.returnValue(of([])),
    getPharmacyShiftAttendanceSummary: jasmine
      .createSpy('getPharmacyShiftAttendanceSummary')
      .and.returnValue(of({ shifts: [] })),
    getPharmacyShiftAttendance: jasmine.createSpy('getPharmacyShiftAttendance').and.returnValue(of([])),
    savePharmacyShiftAttendance: jasmine.createSpy('savePharmacyShiftAttendance').and.returnValue(of({ message: 'ok' })),
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

  beforeEach(async () => {
    ensureLocalizeShim();
    localStorage.removeItem('pharmacy-dashboard-ui-v1');

    await TestBed.configureTestingModule({
      imports: [PharmacyDashboardComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: signal(null) } },
        { provide: PharmacyService, useValue: pharmacyServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: ConfirmationService, useValue: confirmationMock },
      ],
    }).compileComponents();
  });

  it('conserva nombre de farmacia por defecto localizable', () => {
    const fixtureNoUser = TestBed.createComponent(PharmacyDashboardComponent);
    fixtureNoUser.detectChanges();
    const c = fixtureNoUser.componentInstance;
    expect(c.pharmacyUserName).toMatch(/Farmacia/i);
    expect(c.headerUserName).toMatch(/Farmacia/i);
  });
});
