import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface MedicationReport {
  patientId: number;
  patientName: string;
  medication: string;
  dosage: string;
  scheduled: number;
  administered: number;
  missed: number;
  complianceRate: number;
}

export interface ComplianceStats {
  totalSchedules: number;
  administered: number;
  missed: number;
  cancelled: number;
  complianceRate: number;
  byPatient: Array<{
    patientId: number;
    patientName: string;
    totalSchedules?: number;
    administered?: number;
    missed?: number;
    cancelled?: number;
    complianceRate: number;
  }>;
}

export type ComplianceExportFilter =
  | 'scheduled'
  | 'completed'
  | 'missed'
  | 'cancelled'
  | 'rate'
  | null;

export interface ReportDownloadRequest {
  kind: 'medication' | 'compliance';
  complianceFilter: ComplianceExportFilter;
}

export interface ReportExportResult {
  blob: Blob;
  filename: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  /**
   * Generar reporte de medicamentos
   */
  generateMedicationReport(
    startDate: Date,
    endDate: Date,
    patientId?: number,
    /** Admin/supervisor: filtrar por pacientes visibles a esta enfermera; omitir = todo el centro */
    nurseUserId?: number | null
  ): Observable<{ report: MedicationReport[]; period: any; generatedAt: Date }> {
    let params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    if (patientId) {
      params = params.set('patientId', patientId.toString());
    }
    if (nurseUserId != null && !Number.isNaN(Number(nurseUserId))) {
      params = params.set('nurseUserId', String(nurseUserId));
    }

    return this.http.get<{ report: MedicationReport[]; period: any; generatedAt: Date }>(
      `${this.apiUrl}/medications`,
      { params }
    );
  }

  /**
   * Generar estadísticas de cumplimiento
   */
  generateComplianceStats(
    startDate: Date,
    endDate: Date,
    patientId?: number,
    nurseUserId?: number | null
  ): Observable<{ stats: ComplianceStats; period: any; generatedAt: Date }> {
    let params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    if (patientId) {
      params = params.set('patientId', patientId.toString());
    }
    if (nurseUserId != null && !Number.isNaN(Number(nurseUserId))) {
      params = params.set('nurseUserId', String(nurseUserId));
    }

    return this.http.get<{ stats: ComplianceStats; period: any; generatedAt: Date }>(
      `${this.apiUrl}/compliance`,
      { params }
    );
  }

  /**
   * Exportar reporte
   */
  exportReport(
    type: 'medication' | 'compliance',
    format: 'pdf' | 'csv',
    startDate: Date,
    endDate: Date,
    patientId?: number,
    nurseUserId?: number | null,
    complianceFilter?: ComplianceExportFilter,
  ): Observable<ReportExportResult> {
    let params = new HttpParams()
      .set('type', type)
      .set('format', format)
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    if (patientId) {
      params = params.set('patientId', patientId.toString());
    }
    if (nurseUserId != null && !Number.isNaN(Number(nurseUserId))) {
      params = params.set('nurseUserId', String(nurseUserId));
    }
    if (complianceFilter) {
      params = params.set('complianceFilter', complianceFilter);
    }

    return this.http
      .get(`${this.apiUrl}/export`, {
        params,
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<Blob>) => {
          const blob = response.body ?? new Blob();
          const fallback = `reporte-${type}-${startDate.toISOString().slice(0, 10)}_${endDate.toISOString().slice(0, 10)}.${format}`;
          const filename = this.parseFilenameFromDisposition(
            response.headers.get('Content-Disposition'),
            fallback,
          );
          return { blob, filename };
        }),
      );
  }

  private parseFilenameFromDisposition(header: string | null, fallback: string): string {
    if (!header) {
      return fallback;
    }
    const match = /filename="([^"]+)"/i.exec(header);
    return match?.[1] ?? fallback;
  }

  /**
   * Descargar reporte
   */
  downloadReport(
    type: 'medication' | 'compliance',
    format: 'pdf' | 'csv',
    startDate: Date,
    endDate: Date,
    patientId?: number,
    nurseUserId?: number | null,
    complianceFilter?: ComplianceExportFilter,
  ): void {
    this.exportReport(type, format, startDate, endDate, patientId, nurseUserId, complianceFilter).subscribe({
      next: ({ blob, filename }) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting report:', error);
      },
    });
  }
}
