import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    complianceRate: number;
  }>;
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
    format: 'pdf' | 'excel' | 'csv',
    startDate: Date,
    endDate: Date,
    patientId?: number,
    nurseUserId?: number | null
  ): Observable<Blob> {
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

    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob',
    });
  }

  /**
   * Descargar reporte
   */
  downloadReport(
    type: 'medication' | 'compliance',
    format: 'pdf' | 'excel' | 'csv',
    startDate: Date,
    endDate: Date,
    patientId?: number,
    nurseUserId?: number | null
  ): void {
    this.exportReport(type, format, startDate, endDate, patientId, nurseUserId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report-${type}-${new Date().toISOString().split('T')[0]}.${format}`;
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
