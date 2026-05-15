import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { Patient as AdminPatient } from '../../../services/admin.service';
import { AdminService } from '../../../services/admin.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import { ToastService } from '../../../services/toast.service';
import { NurseEditBedModalComponent } from './nurse-edit-bed-modal.component';

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

const MOCK_AREA_PATIENTS: AdminPatient[] = [
  {
    id: 10,
    firstName: 'Ana',
    lastName: 'García',
    identificationNumber: 'ID-10',
    areaId: 3,
    isActive: true,
    bedId: null,
  },
  {
    id: 11,
    firstName: 'Luis',
    lastName: 'Pérez',
    identificationNumber: 'ID-11',
    areaId: 99,
    isActive: true,
    bedId: null,
  },
];

describe('NurseEditBedModalComponent', () => {
  let fixture: ComponentFixture<NurseEditBedModalComponent>;
  const adminMock = {
    getPatientsPage: jasmine.createSpy('getPatientsPage').and.returnValue(
      of({ items: MOCK_AREA_PATIENTS, total: 2, page: 1, limit: 500, totalPages: 1 })
    ),
    getNursesByArea: jasmine.createSpy('getNursesByArea').and.returnValue(of([{ id: 7, firstName: 'X', lastName: 'Y' }])),
    updateBed: jasmine.createSpy('updateBed').and.returnValue(of({ ok: true })),
  };
  const confirmationMock = {
    confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve(false)),
  };
  const toastMock = {
    warning: jasmine.createSpy('warning'),
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
  };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [NurseEditBedModalComponent],
      providers: [
        { provide: AdminService, useValue: adminMock },
        { provide: ConfirmationService, useValue: confirmationMock },
        { provide: ToastService, useValue: toastMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NurseEditBedModalComponent);
    fixture.componentRef.setInput('bed', {
      id: 1,
      bedNumber: '205',
      patientId: null,
      isActive: true,
      areaId: 3,
    });
    fixture.componentRef.setInput('myBeds', [
      { id: 1, bedNumber: '205', patientId: null },
      { id: 2, bedNumber: '206', patientId: 11 },
    ]);
    fixture.detectChanges();
    adminMock.getPatientsPage.calls.reset();
    adminMock.getPatientsPage.and.returnValue(
      of({ items: MOCK_AREA_PATIENTS, total: 2, page: 1, limit: 500, totalPages: 1 })
    );
    adminMock.getNursesByArea.calls.reset();
    adminMock.getNursesByArea.and.returnValue(of([{ id: 7, firstName: 'X', lastName: 'Y' }]));
    adminMock.updateBed.calls.reset();
    adminMock.updateBed.and.returnValue(of({ ok: true }));
    toastMock.warning.calls.reset();
    toastMock.success.calls.reset();
    toastMock.error.calls.reset();
  });

  it('plantilla expone ids de cerrar, cancelar y guardar', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#nurse-edit-bed-modal-close-btn')).toBeTruthy();
    expect(root.querySelector('#nurse-edit-bed-cancel-btn')).toBeTruthy();
    expect(root.querySelector('#nurse-edit-bed-save-btn')).toBeTruthy();
  });

  it('Cancelar y cerrar cabecera emiten dismissed', () => {
    spyOn(fixture.componentInstance.dismissed, 'emit');
    (fixture.nativeElement.querySelector('#nurse-edit-bed-cancel-btn') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('#nurse-edit-bed-modal-close-btn') as HTMLButtonElement).click();
    expect(fixture.componentInstance.dismissed.emit).toHaveBeenCalledTimes(2);
  });

  it('getPatientBed encuentra la cama del paciente', () => {
    expect(fixture.componentInstance.getPatientBed(11)?.bedNumber).toBe('206');
    expect(fixture.componentInstance.getPatientBed(null)).toBeNull();
    expect(fixture.componentInstance.getPatientBed('bad')).toBeNull();
  });

  it('filterPatientsForBed reduce la lista por nombre o documento', () => {
    fixture.componentInstance.allPatientsPool = [
      { id: 1, firstName: 'María', lastName: 'Torres', identificationNumber: 'DOC-1', areaId: 3 },
      { id: 2, firstName: 'Pedro', lastName: 'Ruiz', identificationNumber: 'XYZ-2', areaId: 3 },
    ] as AdminPatient[];
    fixture.componentInstance.patientSearchTerm = 'pedro';
    fixture.componentInstance.filterPatientsForBed();
    expect(fixture.componentInstance.filteredPatientsForBed.length).toBe(1);
    expect(fixture.componentInstance.filteredPatientsForBed[0].firstName).toBe('Pedro');

    fixture.componentInstance.patientSearchTerm = 'doc-1';
    fixture.componentInstance.filterPatientsForBed();
    expect(fixture.componentInstance.filteredPatientsForBed.length).toBe(1);
    expect(fixture.componentInstance.filteredPatientsForBed[0].id).toBe(1);
  });

  it('patientRowSelectAriaLabel incluye nombre del paciente', () => {
    const p = MOCK_AREA_PATIENTS[0]!;
    const aria = fixture.componentInstance.patientRowSelectAriaLabel(p);
    expect(aria).toContain('Ana');
    expect(aria).toContain('García');
  });

  it('saveBedChanges valida número de cama vacío', () => {
    fixture.componentInstance.editBedForm.bedNumber = '   ';
    fixture.componentInstance.saveBedChanges();
    expect(toastMock.warning).toHaveBeenCalledWith('El número de cama es requerido');
    expect(adminMock.updateBed).not.toHaveBeenCalled();
  });

  it('saveBedChanges guarda y emite saved', () => {
    let saved = false;
    const sub = fixture.componentInstance.saved.subscribe(() => {
      saved = true;
    });
    fixture.componentInstance.editBedForm.bedNumber = ' 208 ';
    fixture.componentInstance.editBedForm.patientId = 10;
    (fixture.nativeElement.querySelector('#nurse-edit-bed-save-btn') as HTMLButtonElement).click();
    expect(adminMock.updateBed).toHaveBeenCalledWith(1, {
      bedNumber: '208',
      isActive: true,
      patientId: 10,
    });
    expect(toastMock.success).toHaveBeenCalled();
    expect(saved).toBeTrue();
    sub.unsubscribe();
  });

  it('saveBedChanges incluye assignedToId cuando hubo elección explícita de enfermera', () => {
    fixture.componentInstance.editBedForm.bedNumber = '208';
    fixture.componentInstance.editBedForm.patientId = 10;
    fixture.componentInstance.pendingAssignedToId = 42;
    fixture.componentInstance.saveBedChanges();
    expect(adminMock.updateBed).toHaveBeenCalledWith(1, {
      bedNumber: '208',
      isActive: true,
      patientId: 10,
      assignedToId: 42,
    });
  });

  it('saveBedChanges muestra error y programa reloadRequested si falla el guardado', fakeAsync(() => {
    adminMock.updateBed.and.returnValue(throwError(() => ({ error: { message: 'conflicto' } })));
    let reloads = 0;
    const subReload = fixture.componentInstance.reloadRequested.subscribe(() => reloads++);
    fixture.componentInstance.editBedForm.bedNumber = '209';
    fixture.componentInstance.saveBedChanges();
    expect(toastMock.error).toHaveBeenCalledWith('conflicto');
    tick(500);
    expect(reloads).toBe(1);
    subReload.unsubscribe();
    adminMock.updateBed.and.returnValue(of({ ok: true }));
  }));
});
