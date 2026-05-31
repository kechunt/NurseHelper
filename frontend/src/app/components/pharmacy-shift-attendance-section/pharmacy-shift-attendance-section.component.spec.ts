import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PharmacyShiftAttendanceSectionComponent } from './pharmacy-shift-attendance-section.component';
import { PharmacyService, PharmacyShiftAttendanceRow } from '../../services/pharmacy.service';
import { ToastService } from '../../services/toast.service';

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

describe('PharmacyShiftAttendanceSectionComponent', () => {
  const pharmacyServiceMock = {
    getWorkShifts: jasmine.createSpy('getWorkShifts').and.returnValue(of([])),
    getPharmacyShiftAttendanceSummary: jasmine
      .createSpy('getPharmacyShiftAttendanceSummary')
      .and.returnValue(of({ shifts: [] })),
    getPharmacyShiftAttendance: jasmine.createSpy('getPharmacyShiftAttendance').and.returnValue(of([])),
    savePharmacyShiftAttendance: jasmine.createSpy('savePharmacyShiftAttendance').and.returnValue(of({ message: 'ok' })),
  };

  const toastMock = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
    warning: jasmine.createSpy('warning'),
    info: jasmine.createSpy('info'),
  };

  let fixture: ComponentFixture<PharmacyShiftAttendanceSectionComponent>;

  beforeEach(async () => {
    ensureLocalizeShim();
    pharmacyServiceMock.getWorkShifts.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [PharmacyShiftAttendanceSectionComponent],
      providers: [
        { provide: PharmacyService, useValue: pharmacyServiceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PharmacyShiftAttendanceSectionComponent);
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('expone textos de asistencia localizables', () => {
    const c = fixture.componentInstance;
    expect(c.pharmacyAttendanceSectionTitle).toContain('Asistencia');
    expect(c.pharmacyAttendanceThStaff).toContain('Personal');
    expect(c.pharmacyAttendanceStatusPresent).toContain('Presente');
  });

  it('sin fecha ni turno: aviso localizado al guardar', () => {
    const c = fixture.componentInstance;
    c.pharmacyAttendanceDate = '';
    c.pharmacyAttendanceShiftId = null;
    c.savePharmacyShiftAttendance();
    expect(toastMock.warning).toHaveBeenCalled();
    expect(String(toastMock.warning.calls.mostRecent().args[0])).toMatch(/fecha|turno/i);
  });

  it('error al cargar turnos: mensaje localizado por defecto', () => {
    pharmacyServiceMock.getWorkShifts.and.returnValue(throwError(() => ({ error: {} })));
    const f = TestBed.createComponent(PharmacyShiftAttendanceSectionComponent);
    f.detectChanges();
    expect(f.componentInstance.pharmacyAttendanceLoadError).toContain('turnos');
  });

  it('abre modal de asistencia al pulsar una fila', () => {
    const c = fixture.componentInstance;
    const row = {
      pharmacyUserId: 1,
      pharmacyUserName: 'Ana Farmacia',
      status: 'present' as const,
    };
    c.openPharmacyAttendanceSheet(row);
    expect(c.pharmacyAttendanceActionsRow).toBe(row);
    expect(c.getPharmacyAttendanceModalTitle()).toContain('Ana');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-sched-attendance-assign-modal')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.sched-attendance-status-btn').length).toBe(5);
    c.closePharmacyAttendanceSheet();
    expect(c.pharmacyAttendanceActionsRow).toBeNull();
  });

  it('marcar presente actualiza estado y programa guardado', () => {
    const c = fixture.componentInstance;
    c.pharmacyAttendanceDate = '2026-05-20';
    c.pharmacyAttendanceShiftId = 1;
    const row: PharmacyShiftAttendanceRow = {
      pharmacyUserId: 2,
      pharmacyUserName: 'Bob',
      status: 'absent',
    };
    c.pharmacyAttendanceRows = [row];
    c.markPharmacyPresent(row);
    expect(row.status).toBe('present');
    expect(row.checkInAt).toBeTruthy();
  });
});
