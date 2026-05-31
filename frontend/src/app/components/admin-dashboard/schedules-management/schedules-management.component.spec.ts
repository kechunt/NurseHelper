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
    updateUser: jasmine.createSpy('updateUser').and.returnValue(of({})),
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
    getShiftAttendanceHistory: jasmine.createSpy('getShiftAttendanceHistory').and.returnValue(of([])),
    saveShiftAttendance: jasmine.createSpy('saveShiftAttendance').and.returnValue(
      of({ message: 'ok', handoff: null }),
    ),
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

  it('resolveDefaultAreaIdForNurse usa el área más reciente del mismo turno', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.selectedShiftAttendanceId = 1;
    c.nurses = [{ id: 10, assignedAreaId: 1, firstName: 'Ana', lastName: 'G' } as any];
    c.areas = [{ id: 2, name: 'Piso 2' }, { id: 5, name: 'area a' }];

    const history = [
      { nurseId: 10, shiftId: 1, status: 'present', date: '2026-05-20', assignedAreaId: 2 },
      { nurseId: 10, shiftId: 1, status: 'present', date: '2026-05-28', assignedAreaId: 5 },
      { nurseId: 10, shiftId: 2, status: 'present', date: '2026-05-29', assignedAreaId: 99 },
    ] as any[];

    expect(c.resolveDefaultAreaIdForNurse(10, history)).toBe(5);
  });

  it('resolveDefaultAreaIdForNurse cae al perfil si no hay historial del turno', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.selectedShiftAttendanceId = 1;
    c.nurses = [{ id: 10, assignedAreaId: 3, firstName: 'Ana', lastName: 'G' } as any];

    expect(c.resolveDefaultAreaIdForNurse(10, [])).toBe(3);
  });

  it('openAttendanceAssignModal pre-rellena área sugerida desde historial', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.selectedShiftAttendanceId = 1;
    c.nurses = [{ id: 10, assignedAreaId: 1, firstName: 'Ana', lastName: 'G' } as any];
    c.areas = [{ id: 2, name: 'Piso 2' }];
    shiftsServiceMock.getShiftAttendanceHistory.and.returnValue(
      of([
        { nurseId: 10, shiftId: 1, status: 'present', date: '2026-05-28', assignedAreaId: 2 },
      ] as any[]),
    );

    const item = {
      nurseId: 10,
      nurseName: 'Ana G',
      status: 'absent',
      assignedAreaId: 1,
      checkInAt: null,
      checkOutAt: null,
      notes: null,
    } as any;

    c.openAttendanceAssignModal(item);

    expect(c.showAttendanceAssignModal).toBe(true);
    expect(c.attendanceAssignAreaId).toBe(2);
    expect(c.attendanceAssignSuggestedAreaId).toBe(2);
    expect(c.attendanceAssignLoading).toBe(false);
  });

  it('saveAttendanceWithArea actualiza área y guarda asistencia en orden', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.selectedShiftAttendanceId = 1;
    c.nurses = [{ id: 10, assignedAreaId: 1, firstName: 'Ana', lastName: 'G' } as any];
    c.areas = [{ id: 2, name: 'Piso 2' }];
    c.attendanceItems = [
      {
        nurseId: 10,
        nurseName: 'Ana G',
        status: 'absent',
        assignedAreaId: 1,
        checkInAt: null,
        checkOutAt: null,
        notes: null,
      },
    ] as any[];
    c.attendanceAssignAreaId = 2;

    const item = c.attendanceItems[0];
    c.saveAttendanceWithArea(item, 'present');

    expect(adminServiceMock.updateUser).toHaveBeenCalledWith(10, { assignedAreaId: 2 });
    expect(shiftsServiceMock.saveShiftAttendance).toHaveBeenCalled();
    expect(item.status).toBe('present');
    expect(item.assignedAreaId).toBe(2);
  });

  it('getAttendanceStatusBadgeClass incluye el estado', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.getAttendanceStatusBadgeClass('present')).toContain('present');
    expect(c.getAttendanceStatusBadgeClass('absent')).toContain('absent');
  });

  it('filteredAttendanceItems ordena presentes primero y filtra por estado', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.attendanceItems = [
      { nurseId: 1, nurseName: 'Zoe', status: 'absent', assignedAreaId: 1 } as any,
      { nurseId: 2, nurseName: 'Ana', status: 'present', assignedAreaId: 1 } as any,
      { nurseId: 3, nurseName: 'Bea', status: 'late', assignedAreaId: 1 } as any,
    ];

    const all = c.filteredAttendanceItems.map((i) => i.nurseName);
    expect(all).toEqual(['Ana', 'Bea', 'Zoe']);

    c.attendanceListStatusFilter = 'present';
    expect(c.filteredAttendanceItems.map((i) => i.nurseName)).toEqual(['Ana']);
  });

  it('onAttendanceListShiftChange recarga asistencia del turno elegido', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    shiftsServiceMock.getShiftAttendance.calls.reset();
    c.onAttendanceListShiftChange(2);
    expect(c.selectedShiftAttendanceId).toBe(2);
    expect(shiftsServiceMock.getShiftAttendance).toHaveBeenCalled();
  });
});
