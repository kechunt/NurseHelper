import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { OverviewComponent } from './overview.component';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { ShiftsService } from '../../../services/shifts.service';
import { ShiftRealtimeService } from '../../../shared/services/shift-realtime.service';

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

describe('OverviewComponent', () => {
  let fixture: ComponentFixture<OverviewComponent>;

  const adminServiceMock = {
    getUsers: jasmine.createSpy('getUsers').and.returnValue(of([{ id: 1, role: 'nurse' }])),
    getAreas: jasmine.createSpy('getAreas').and.returnValue(of([{ id: 1 }])),
    getBeds: jasmine.createSpy('getBeds').and.returnValue(of([{ id: 1, patientId: null }])),
    getPatientsTotal: jasmine.createSpy('getPatientsTotal').and.returnValue(of(3)),
    listBackups: jasmine.createSpy('listBackups').and.returnValue(of({ backups: [], lastBackup: null })),
    createBackup: jasmine.createSpy('createBackup').and.returnValue(of({ filename: 'test.sql' })),
  };

  const toastMock = {
    error: jasmine.createSpy('error'),
  };

  const shiftsServiceMock = {
    getAllShifts: jasmine.createSpy('getAllShifts').and.returnValue(of([])),
  };

  const shiftRealtimeMock = {
    formatDateTimeLabel: jasmine.createSpy('formatDateTimeLabel').and.returnValue('lun., 01/01/2026, 12:00:00'),
    resolveCurrentShift: jasmine.createSpy('resolveCurrentShift').and.returnValue(null),
    formatShiftLabel: jasmine.createSpy('formatShiftLabel').and.returnValue('Sin turno activo'),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [OverviewComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: ShiftsService, useValue: shiftsServiceMock },
        { provide: ShiftRealtimeService, useValue: shiftRealtimeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OverviewComponent);
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('tras loadStats agrega conteos y deja loading en false', () => {
    const c = fixture.componentInstance;
    expect(c.loading).toBe(false);
    expect(c.stats.users).toBe(1);
    expect(c.stats.nurses).toBe(1);
    expect(c.stats.areas).toBe(1);
    expect(c.stats.beds).toBe(1);
    expect(c.stats.patients).toBe(3);
    expect(c.stats.availableBeds).toBe(1);
    expect(adminServiceMock.getUsers).toHaveBeenCalled();
  });

  it('navigate delega en onNavigate cuando existe', () => {
    const nav = jasmine.createSpy('navigate');
    fixture.componentInstance.onNavigate = nav;
    fixture.componentInstance.navigate('beds');
    expect(nav).toHaveBeenCalledWith('beds');
  });

  it('expone mensaje localizado de error al cargar estadísticas', () => {
    expect(fixture.componentInstance.adminOverviewErrLoadStats).toContain('estadísticas');
  });

  it('carga respaldos al iniciar', () => {
    expect(adminServiceMock.listBackups).toHaveBeenCalled();
    expect(fixture.componentInstance.loadingBackups).toBe(false);
    expect(fixture.componentInstance.backups).toEqual([]);
  });
});

describe('OverviewComponent (fallo loadStats)', () => {
  const toastMock = {
    error: jasmine.createSpy('error'),
  };

  const shiftsServiceMock = {
    getAllShifts: jasmine.createSpy('getAllShifts').and.returnValue(of([])),
  };

  const shiftRealtimeMock = {
    formatDateTimeLabel: jasmine.createSpy('formatDateTimeLabel').and.returnValue(''),
    resolveCurrentShift: jasmine.createSpy('resolveCurrentShift').and.returnValue(null),
    formatShiftLabel: jasmine.createSpy('formatShiftLabel').and.returnValue(''),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    ensureLocalizeShim();
    const failAdmin = {
      getUsers: jasmine.createSpy('getUsers').and.returnValue(throwError(() => ({}))),
      getAreas: jasmine.createSpy('getAreas').and.returnValue(of([])),
      getBeds: jasmine.createSpy('getBeds').and.returnValue(of([])),
      getPatientsTotal: jasmine.createSpy('getPatientsTotal').and.returnValue(of(0)),
      listBackups: jasmine.createSpy('listBackups').and.returnValue(of({ backups: [], lastBackup: null })),
      createBackup: jasmine.createSpy('createBackup').and.returnValue(of({ filename: 'test.sql' })),
    };
    await TestBed.configureTestingModule({
      imports: [OverviewComponent],
      providers: [
        { provide: AdminService, useValue: failAdmin },
        { provide: ToastService, useValue: toastMock },
        { provide: ShiftsService, useValue: shiftsServiceMock },
        { provide: ShiftRealtimeService, useValue: shiftRealtimeMock },
      ],
    }).compileComponents();
  });

  it('notifica error con mensaje localizado cuando forkJoin falla', () => {
    const f = TestBed.createComponent(OverviewComponent);
    f.detectChanges();
    expect(toastMock.error).toHaveBeenCalled();
    const msg = toastMock.error.calls.mostRecent().args[0] as string;
    expect(msg).toContain('estadísticas');
  });
});
