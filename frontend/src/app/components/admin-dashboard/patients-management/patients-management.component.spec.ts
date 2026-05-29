import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { PatientsManagementComponent } from './patients-management.component';
import { AdminService } from '../../../services/admin.service';
import { AdminPatientBedAssignmentService } from '../../../services/admin-patient-bed-assignment.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import { ExportService } from '../../../shared/services/export.service';

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

describe('PatientsManagementComponent', () => {
  const adminServiceMock = {
    getAreas: jasmine.createSpy('getAreas').and.returnValue(of([])),
    getBeds: jasmine.createSpy('getBeds').and.returnValue(of([])),
    getUsers: jasmine.createSpy('getUsers').and.returnValue(of([])),
    getPatientsPage: jasmine.createSpy('getPatientsPage').and.returnValue(
      of({ items: [], total: 0, page: 1, totalPages: 1, limit: 25 })
    ),
  };

  beforeEach(async () => {
    ensureLocalizeShim();
    await TestBed.configureTestingModule({
      imports: [PatientsManagementComponent],
      providers: [
        provideHttpClient(),
        { provide: AdminService, useValue: adminServiceMock },
        {
          provide: AdminPatientBedAssignmentService,
          useValue: { assignPatientToBed: jasmine.createSpy().and.returnValue(of({})) },
        },
        {
          provide: ToastService,
          useValue: { success: jasmine.createSpy(), error: jasmine.createSpy(), warning: jasmine.createSpy(), info: jasmine.createSpy() },
        },
        { provide: ConfirmationService, useValue: { confirm: jasmine.createSpy().and.returnValue(Promise.resolve(false)) } },
        { provide: ExportService, useValue: { exportToCSV: jasmine.createSpy() } },
      ],
    }).compileComponents();
  });

  it('expone cadenas de listado y estado localizables', () => {
    const fixture = TestBed.createComponent(PatientsManagementComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.adminPatientsNoArea).toContain('Sin');
    expect(c.adminPatientsStatusActive).toContain('Activo');
    expect(c.patientStatusLabel(true)).toContain('Activo');
    expect(c.patientStatusLabel(false)).toContain('Inactivo');
    expect(c.adminPatientsEmDash.length).toBeGreaterThan(0);
  });
});
