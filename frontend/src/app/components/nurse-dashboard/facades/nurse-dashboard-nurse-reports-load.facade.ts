import { Injectable, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ReportService } from '../../../services/report.service';

/**
 * Carga paralela de informes de medicación y cumplimiento para el modal de reportes enfermería.
 */
@Injectable()
export class NurseDashboardNurseReportsLoadFacade {
  private readonly reportService = inject(ReportService);

  loadReportsBundle(start: Date, end: Date) {
    return forkJoin({
      med: this.reportService.generateMedicationReport(start, end),
      comp: this.reportService.generateComplianceStats(start, end),
    });
  }
}
