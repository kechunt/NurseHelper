import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AreasManagementComponent } from './areas-management.component';
import { AdminService } from '../../../services/admin.service';
import { AdminPatientBedAssignmentService } from '../../../services/admin-patient-bed-assignment.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import { AdminShiftCoverageAlertNavigationService } from '../../../services/admin-shift-coverage-alert-navigation.service';

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

describe('AreasManagementComponent', () => {
  let fixture: ComponentFixture<AreasManagementComponent>;

  const coveragePayload = {
    date: '2026-01-01',
    hasActiveShift: false,
    shiftId: null,
    shiftName: null,
    shiftTime: null,
    areas: [],
  };

  const adminServiceMock = {
    getAreas: jasmine.createSpy('getAreas').and.returnValue(of([{ id: 1, name: 'Sala A', isActive: true }])),
    getAreasShiftCoverage: jasmine.createSpy('getAreasShiftCoverage').and.returnValue(of(coveragePayload)),
    getBeds: jasmine.createSpy('getBeds').and.returnValue(of([])),
    getPatients: jasmine.createSpy('getPatients').and.returnValue(of([])),
    getBedsByArea: jasmine.createSpy('getBedsByArea').and.returnValue(of([])),
  };

  const bedAssignMock = {
    assignPatientToBed: jasmine.createSpy('assignPatientToBed'),
  };

  const toastServiceMock = {
    warning: jasmine.createSpy('warning'),
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
  };

  const confirmationServiceMock = {
    confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve(false)),
  };

  const shiftCoverageNavMock = {
    navigateToSchedulesTab: jasmine.createSpy('navigateToSchedulesTab'),
  };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [AreasManagementComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: AdminPatientBedAssignmentService, useValue: bedAssignMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: ConfirmationService, useValue: confirmationServiceMock },
        { provide: AdminShiftCoverageAlertNavigationService, useValue: shiftCoverageNavMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AreasManagementComponent);
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('expone textos de cabecera y título de modal de camas localizables', () => {
    const c = fixture.componentInstance;
    expect(c.areasSectionTitle).toContain('Gestión de Áreas');
    expect(c.areasBedsModalTitle({ id: 1, name: 'UCI', isActive: true } as any)).toContain('UCI');
  });

  it('expone helpers HTML de fila cama, título formulario área y conteo pacientes', () => {
    const c = fixture.componentInstance;
    expect(c.getAriaAreaBedRow('12')).toContain('12');
    c.selectedArea = null;
    expect(c.getAreaFormModalTitle()).toContain('Crear');
    c.selectedArea = { id: 1, name: 'X', isActive: true } as any;
    expect(c.getAreaFormModalTitle()).toContain('Editar');
    expect(c.getAreaPatientCountLabel(3)).toContain('3');
    const bed = { id: 1, bedNumber: 'A1', patientId: 9, areaId: 1, isActive: true } as any;
    expect(c.formatBedAssignmentOptionLabel(bed, 'assign')).toContain('A1');
  });

  it('tras ngOnInit carga áreas y deja de estar en loading', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.loading).toBe(false);
    expect(c.areas.length).toBe(1);
    expect(c.areas[0].name).toBe('Sala A');
    expect(adminServiceMock.getAreas).toHaveBeenCalled();
    expect(adminServiceMock.getAreasShiftCoverage).toHaveBeenCalled();
    expect(adminServiceMock.getBeds).toHaveBeenCalled();
    expect(adminServiceMock.getPatients).toHaveBeenCalled();
  });

  it('expone avisos de guardado de área y paciente sin área localizables', () => {
    const c = fixture.componentInstance;
    expect(c.areasWarnNameRequired).toContain('requerido');
    expect(c.areasPatientNoArea).toContain('Sin área');
    expect(c.areasConfirmCancel).toContain('Cancelar');
  });

  it('muestra modal asignar área con app-modal-shell tema assign', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.selectedPatientForArea = {
      id: 99,
      firstName: 'Ana',
      lastName: 'Pérez',
      identificationNumber: 'ID-1',
    };
    c.showAssignAreaModal = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Asignar área y cama');
    expect(fixture.nativeElement.querySelector('app-modal-shell .admin-assign-modal-backdrop')).toBeTruthy();
  });

  it('muestra modal cambiar área con app-modal-shell tema assign', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.selectedPatientForArea = {
      id: 88,
      firstName: 'Luis',
      lastName: 'García',
      areaName: 'Sala A',
      bedNumber: '12',
      areaId: 1,
      bedId: 5,
    };
    c.changeAreaForm = { areaId: 1, bedId: 5 };
    c.showChangeAreaModal = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cambiar área y cama');
    expect(fixture.nativeElement.querySelector('app-modal-shell .admin-assign-modal-backdrop')).toBeTruthy();
  });
});
