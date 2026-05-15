import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BedsManagementComponent } from './beds-management.component';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import { AdminPatientBedAssignmentService } from '../../../services/admin-patient-bed-assignment.service';
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

describe('BedsManagementComponent', () => {
  let fixture: ComponentFixture<BedsManagementComponent>;

  const bedsFixture = [
    { id: 1, bedNumber: '101', areaId: 5, isActive: true, patientId: null },
    { id: 2, bedNumber: '102', areaId: 5, isActive: true, patientId: 10 },
  ];

  const patientsFixture = [
    { id: 10, firstName: 'Pepe', lastName: 'López', isActive: true, bedId: 2, areaId: 5 },
  ];

  const adminServiceMock = {
    getBeds: jasmine.createSpy('getBeds').and.returnValue(of(bedsFixture)),
    getAreas: jasmine.createSpy('getAreas').and.returnValue(of([{ id: 5, name: 'Sala A', isActive: true }])),
    getAreasShiftCoverage: jasmine.createSpy('getAreasShiftCoverage').and.returnValue(of(null)),
    getPatients: jasmine.createSpy('getPatients').and.returnValue(of(patientsFixture)),
    getPatientsPage: jasmine.createSpy('getPatientsPage').and.returnValue(
      of({ items: [], total: 0, page: 1, limit: 1000, totalPages: 0 })
    ),
    createBed: jasmine.createSpy('createBed').and.returnValue(of({})),
  };

  const toastServiceMock = {
    warning: jasmine.createSpy('warning'),
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
  };

  const confirmationServiceMock = {
    confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve(false)),
  };

  const bedAssignMock = {
    assignPatientToBed: jasmine.createSpy('assignPatientToBed').and.returnValue(of({})),
  };

  const shiftCoverageNavMock = {
    openResolveShiftCoverageForArea: jasmine.createSpy('openResolveShiftCoverageForArea'),
  };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [BedsManagementComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: ConfirmationService, useValue: confirmationServiceMock },
        { provide: AdminPatientBedAssignmentService, useValue: bedAssignMock },
        { provide: AdminShiftCoverageAlertNavigationService, useValue: shiftCoverageNavMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BedsManagementComponent);
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('expone título de página localizable', () => {
    expect(fixture.componentInstance.bedsPageTitle).toContain('Gestión de Camas');
  });

  it('Tras ngOnInit: camas, áreas y pacientes cargados', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.loading).toBe(false);
    expect(c.beds.length).toBe(2);
    expect(c.areas.length).toBe(1);
    expect(c.getAreaName(5)).toBe('Sala A');
    expect(adminServiceMock.getBeds).toHaveBeenCalled();
    expect(adminServiceMock.getPatients).toHaveBeenCalled();
  });

  it('filteredBeds y getBedsByArea respetan filtros', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.selectedAreaId = 5;
    expect(c.getBedsByArea(5).length).toBe(2);

    c.filterStatus = 'occupied';
    expect(c.filteredBeds.length).toBe(1);
    expect(c.filteredBeds[0].id).toBe(2);

    c.filterStatus = 'available';
    expect(c.filteredBeds.length).toBe(1);
    expect(c.filteredBeds[0].id).toBe(1);
  });

  it('getPatientNameForBed, getBedClass y getBedStatusLabel', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    const occupied = c.beds.find((b) => (b as any).patientId === 10)!;
    expect(c.getPatientNameForBed(occupied)).toContain('Pepe');
    expect(c.getBedClass(occupied)).toBe('occupied');
    expect(c.getBedStatusLabel(occupied)).toBe('Ocupada');

    const free = c.beds.find((b) => b.id === 1)!;
    expect(c.getBedClass(free)).toBe('available');
    expect(c.getBedStatusLabel(free)).toBe('Disponible');
  });

  it('createBed sin datos obligatorios muestra aviso', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.createBedForm = { bedNumber: '', areaId: null, notes: '' };
    c.createBed();
    expect(toastServiceMock.warning).toHaveBeenCalledWith(c.bedsWarnCreateRequired);
    expect(adminServiceMock.createBed).not.toHaveBeenCalled();
  });

  it('openCreateBedModal usa selectedAreaId como área por defecto', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.selectedAreaId = 5;
    c.openCreateBedModal();
    expect(c.createBedForm.areaId).toBe(5);
    expect(c.showCreateBedModal).toBe(true);
  });

  it('expone avisos y etiquetas de estado/hoja localizables', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.bedsWarnCreateRequired).toContain('requeridos');
    expect(c.bedsStatusLabelOccupied).toContain('Ocupada');
    expect(c.bedsSheetColBed).toContain('Cama');
    expect(c.bedsConfirmCancel).toContain('Cancelar');
  });

  it('helpers HTML: título hoja cama, ARIA cobertura/cama y etiqueta opción cama', () => {
    fixture.detectChanges();
    const c = fixture.componentInstance;
    const bed = c.beds[0];
    c.openBedCardActionsSheet(bed);
    expect(c.getBedCardActionsModalTitle()).toContain('101');
    expect(c.getAriaBedCard(bed)).toContain('101');
    expect(c.getAriaShiftCoverageResolve('UCI')).toContain('UCI');
    expect(c.getAriaSelectPatientRow({ firstName: 'Ana', lastName: 'Ruiz' })).toContain('Ana');
  });
});
