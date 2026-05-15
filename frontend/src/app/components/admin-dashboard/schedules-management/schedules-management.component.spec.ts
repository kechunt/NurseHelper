import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { SchedulesManagementComponent } from './schedules-management.component';
import { AdminService } from '../../../services/admin.service';
import { ShiftsService } from '../../../services/shifts.service';
import { ExportService } from '../../../shared/services/export.service';
import { ShiftRealtimeService } from '../../../shared/services/shift-realtime.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import { ToastService } from '../../../services/toast.service';

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

describe('SchedulesManagementComponent', () => {
  let fixture: ComponentFixture<SchedulesManagementComponent>;

  const adminServiceMock = {
    getAreas: jasmine.createSpy('getAreas').and.returnValue(of([])),
    getUsers: jasmine.createSpy('getUsers').and.returnValue(of([])),
    getPatients: jasmine.createSpy('getPatients').and.returnValue(of([])),
    getBeds: jasmine.createSpy('getBeds').and.returnValue(of([])),
  };

  const shiftsServiceMock = {
    getAllShifts: jasmine.createSpy('getAllShifts').and.returnValue(
      of([
        {
          id: 1,
          type: 'morning',
          name: 'Matutino',
          startTime: '07:00',
          endTime: '15:00',
          isActive: true,
        },
      ])
    ),
    getShiftAttendance: jasmine.createSpy('getShiftAttendance').and.returnValue(of([])),
  };

  const exportServiceMock = {};
  const confirmationServiceMock = {
    confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve(false)),
  };
  const toastServiceMock = {
    warning: jasmine.createSpy('warning'),
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
  };

  const routerMock = {
    navigate: jasmine.createSpy('navigate'),
  };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [SchedulesManagementComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: ShiftsService, useValue: shiftsServiceMock },
        { provide: ExportService, useValue: exportServiceMock },
        ShiftRealtimeService,
        { provide: ConfirmationService, useValue: confirmationServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({}) },
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SchedulesManagementComponent);
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('expone cadenas @@schedMgmt.* (toasts y confirmaciones)', () => {
    const c = fixture.componentInstance;
    expect(c.schedMgmtWarnAreaNotExists.length).toBeGreaterThan(0);
    expect(c.schedConfirmCancel.length).toBeGreaterThan(0);
    expect(c.schedWarnNoSchedulesToSave.length).toBeGreaterThan(0);
  });

  it('getAreaName y etiquetas de asistencia usan textos definidos', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.getAreaName(null)).toBe(c.schedNoArea);
    expect(c.getAttendanceStatusLabel('present')).toContain('Presente');
    expect(c.getAttendanceTableTitle()).toBeTruthy();
  });

  it('helpers HTML: turno resuelto, ARIA resumen y título editar horario', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.liveCurrentShiftLabel = '';
    expect(c.getResolvedShiftLabelForDisplay()).toBe(c.schedHtmlNoActiveShift);
    c.liveCurrentShiftLabel = 'Matutino';
    expect(c.getResolvedShiftLabelForDisplay()).toBe('Matutino');
    const aria = c.getAriaLabelSummaryAttendance({ nurseName: 'Ana P.' } as any);
    expect(aria).toContain('Ana P.');
    c.selectedShift = { name: 'Vespertino' };
    expect(c.getEditShiftModalTitle()).toContain('Vespertino');
  });

  it('Tras ngOnInit: semana ISO, datos cargados y turno descanso al final', () => {
    fixture.detectChanges();

    const c = fixture.componentInstance;
    expect(c.weekStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(c.loading).toBe(false);
    expect(shiftsServiceMock.getAllShifts).toHaveBeenCalled();
    expect(adminServiceMock.getAreas).toHaveBeenCalled();
    expect(c.shifts.some((s: { type?: string }) => s.type === 'off')).toBe(true);
    expect(c.liveDateTimeLabel.length).toBeGreaterThan(0);
  });

  it('openEditShiftModal muestra app-modal-shell con título del turno', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    const shift = c.shifts.find((s: { type?: string }) => s.type === 'morning');
    expect(shift).toBeTruthy();

    c.openEditShiftModal(shift);
    fixture.detectChanges();

    const shells = (fixture.nativeElement as HTMLElement).querySelectorAll('app-modal-shell');
    expect(shells.length).toBe(1);
    const titleText = shells[0].querySelector('.modal-shell-title-text')?.textContent?.trim();
    expect(titleText).toContain('Editar horario');
    expect(titleText).toContain('Matutino');
  });

  it('confirmDayOffChoice cierra el modal y notifica el día elegido', () => {
    const resolve = jasmine.createSpy('resolve');
    const cmp = fixture.componentInstance as any;
    cmp.dayOffPickerResolve = resolve;
    cmp.showDayOffPickerModal = true;

    cmp.confirmDayOffChoice('thursday');

    expect(cmp.showDayOffPickerModal).toBe(false);
    expect(resolve).toHaveBeenCalledWith('thursday');
  });

  it('cancelDayOffPicker cierra el modal y resuelve null', () => {
    const resolve = jasmine.createSpy('resolve');
    const cmp = fixture.componentInstance as any;
    cmp.dayOffPickerResolve = resolve;
    cmp.showDayOffPickerModal = true;

    cmp.cancelDayOffPicker();

    expect(cmp.showDayOffPickerModal).toBe(false);
    expect(resolve).toHaveBeenCalledWith(null);
  });
});
