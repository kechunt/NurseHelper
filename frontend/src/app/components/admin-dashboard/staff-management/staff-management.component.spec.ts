import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { StaffManagementComponent } from './staff-management.component';
import { AdminService } from '../../../services/admin.service';
import { ShiftsService } from '../../../services/shifts.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import { ToastService } from '../../../services/toast.service';

describe('StaffManagementComponent', () => {
  let fixture: ComponentFixture<StaffManagementComponent>;

  const adminServiceMock = {
    getAreas: jasmine.createSpy('getAreas').and.returnValue(of([{ id: 10, name: 'UCI', isActive: true }])),
    getBeds: jasmine.createSpy('getBeds').and.returnValue(of([])),
    getPatients: jasmine.createSpy('getPatients').and.returnValue(of([])),
    getUsersPaginated: jasmine.createSpy('getUsersPaginated').and.returnValue(
      of({
        users: [
          {
            id: 1,
            firstName: 'Ana',
            lastName: 'Ruiz',
            role: 'nurse',
            isActive: true,
            maxPatients: 5,
            assignedAreaId: 10,
          },
        ],
        total: 1,
      })
    ),
  };

  const shiftsServiceMock = {
    getAllShifts: jasmine.createSpy('getAllShifts').and.returnValue(of([])),
    getShiftAttendance: jasmine.createSpy('getShiftAttendance').and.returnValue(of([])),
  };

  const routerMock = {
    navigate: jasmine.createSpy('navigate'),
  };

  const confirmationServiceMock = {
    confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve(false)),
  };

  const toastServiceMock = {
    warning: jasmine.createSpy('warning'),
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffManagementComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: ShiftsService, useValue: shiftsServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ConfirmationService, useValue: confirmationServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffManagementComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('Tras ngOnInit: carga datos, sin error y una enfermera', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.loading).toBe(false);
    expect(c.error).toBeNull();
    expect(c.nurses.length).toBe(1);
    expect(c.nurses[0].firstName).toBe('Ana');
    expect(c.getAreaName(10)).toBe('UCI');
    expect(adminServiceMock.getUsersPaginated).toHaveBeenCalled();
  });

  it('getFilteredNurses respeta búsqueda y clearFilters', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.searchQuery = 'Ruiz';
    expect(c.getFilteredNurses().length).toBe(1);
    c.searchQuery = 'Nadie';
    expect(c.getFilteredNurses().length).toBe(0);
    c.clearFilters();
    expect(c.searchQuery).toBe('');
    expect(c.getFilteredNurses().length).toBe(1);
  });

  it('patientHasBedAssigned detecta cama vía bedId', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.beds = [{ id: 3, bedNumber: '12', areaId: 10, patientId: 99 } as any];
    expect(c.patientHasBedAssigned({ id: 99, bedId: 3 })).toBe(true);
    expect(c.patientHasBedAssigned({ id: 100, bedId: null })).toBe(false);
  });

  it('getOperationalStatusLabel y getShiftPresenceBadgeClass mapean estado', () => {
    const c = fixture.componentInstance;
    const base = {
      id: 1,
      firstName: 'a',
      lastName: 'b',
      assignedPatients: [],
      assignedPatientsCount: 0,
    } as any;
    expect(c.getOperationalStatusLabel({ ...base, currentShiftStatus: 'present' })).toBe('En turno');
    expect(c.getShiftPresenceBadgeClass({ ...base, currentShiftStatus: 'absent' })).toContain('off-shift');
  });

  it('toggleNurseDetail alterna expansión', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    const nurse = c.nurses[0];
    expect(c.isNurseDetailExpanded(nurse)).toBe(false);
    c.toggleNurseDetail(nurse);
    expect(c.isNurseDetailExpanded(nurse)).toBe(true);
    c.toggleNurseDetail(nurse);
    expect(c.isNurseDetailExpanded(nurse)).toBe(false);
  });

  it('getNursePhoneDisplay muestra texto o valor por defecto', () => {
    const c = fixture.componentInstance;
    expect(c.getNursePhoneDisplay({ phone: ' 555 ' } as any)).toBe('555');
    expect(c.getNursePhoneDisplay({} as any)).toBe('No registrado');
  });
});
