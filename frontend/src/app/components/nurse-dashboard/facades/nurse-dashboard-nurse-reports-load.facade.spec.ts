import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReportService } from '../../../services/report.service';
import { NurseDashboardNurseReportsLoadFacade } from './nurse-dashboard-nurse-reports-load.facade';

describe('NurseDashboardNurseReportsLoadFacade', () => {
  let generateMedicationReport: jasmine.Spy;
  let generateComplianceStats: jasmine.Spy;

  beforeEach(() => {
    generateMedicationReport = jasmine
      .createSpy('generateMedicationReport')
      .and.returnValue(of({ report: [], period: {}, generatedAt: new Date() }));
    generateComplianceStats = jasmine
      .createSpy('generateComplianceStats')
      .and.returnValue(of({ stats: {} as any, period: {}, generatedAt: new Date() }));

    TestBed.configureTestingModule({
      providers: [
        NurseDashboardNurseReportsLoadFacade,
        {
          provide: ReportService,
          useValue: {
            generateMedicationReport,
            generateComplianceStats,
          },
        },
      ],
    });
  });

  it('loadReportsBundle llama a informe de medicación y estadísticas de cumplimiento', (done) => {
    const start = new Date('2026-01-01');
    const end = new Date('2026-01-08');
    const facade = TestBed.inject(NurseDashboardNurseReportsLoadFacade);
    facade.loadReportsBundle(start, end).subscribe((res) => {
      expect(res.med.report).toEqual([]);
      expect(generateMedicationReport).toHaveBeenCalledWith(start, end);
      expect(generateComplianceStats).toHaveBeenCalledWith(start, end);
      done();
    });
  });
});
