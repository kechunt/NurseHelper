import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { StaffQuickActionsService } from './staff-quick-actions.service';
import { AdminService } from '../../../services/admin.service';
import { ReportService } from '../../../services/report.service';
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

describe('StaffQuickActionsService', () => {
  const adminMock = {
    getAdminHandoverNote: jasmine.createSpy('getAdminHandoverNote').and.returnValue(of({ note: null })),
    putAdminHandoverNote: jasmine.createSpy('putAdminHandoverNote').and.returnValue(of({})),
    getUsersPaginated: jasmine
      .createSpy('getUsersPaginated')
      .and.returnValue(of({ users: [{ id: 1, firstName: 'A', lastName: 'B', username: 'ab' }] })),
  };
  const reportMock = {
    generateMedicationReport: jasmine.createSpy('generateMedicationReport').and.returnValue(of({ report: [] })),
    generateComplianceStats: jasmine.createSpy('generateComplianceStats').and.returnValue(of({ stats: null })),
    exportReport: jasmine.createSpy('exportReport').and.returnValue(of(new Blob(['x']))),
  };
  const toastMock = {
    warning: jasmine.createSpy('warning'),
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
  };

  beforeEach(() => {
    ensureLocalizeShim();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        StaffQuickActionsService,
        { provide: AdminService, useValue: adminMock },
        { provide: ReportService, useValue: reportMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });
    adminMock.getAdminHandoverNote.calls.reset();
    adminMock.putAdminHandoverNote.calls.reset();
    adminMock.getUsersPaginated.calls.reset();
    reportMock.generateMedicationReport.calls.reset();
    reportMock.generateComplianceStats.calls.reset();
    reportMock.exportReport.calls.reset();
    toastMock.warning.calls.reset();
    toastMock.success.calls.reset();
    toastMock.error.calls.reset();
    adminMock.getAdminHandoverNote.and.returnValue(of({ note: null }));
    adminMock.putAdminHandoverNote.and.returnValue(of({}));
    adminMock.getUsersPaginated.and.returnValue(
      of({ users: [{ id: 1, firstName: 'A', lastName: 'B', username: 'ab' }] })
    );
  });

  it('expone mensajes localizables de handover', () => {
    const svc = TestBed.inject(StaffQuickActionsService);
    expect(svc.staffQuickWarnHandoverLoad).toContain('coordinación');
    expect(svc.staffQuickErrReportsLoad.toLowerCase()).toContain('report');
  });

  it('tras error al cargar handover muestra aviso localizado', () => {
    adminMock.getAdminHandoverNote.and.returnValue(throwError(() => ({})));
    const svc = TestBed.inject(StaffQuickActionsService);
    svc.openTeamHandover();
    expect(toastMock.warning).toHaveBeenCalledWith(jasmine.stringMatching(/coordinaci/));
  });

  it('downloadPdf descarga reporte PDF vía ReportService', () => {
    const svc = TestBed.inject(StaffQuickActionsService);
    svc.openReports();
    svc.downloadPdf('compliance');
    expect(reportMock.exportReport).toHaveBeenCalledWith(
      'compliance',
      'pdf',
      jasmine.any(Date),
      jasmine.any(Date),
      undefined,
      null
    );
    expect(toastMock.success).toHaveBeenCalled();
  });
});
