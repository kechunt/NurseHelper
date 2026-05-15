import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NurseService, type PatientDetail } from '../../../services/nurse.service';

/**
 * Carga de ficha de paciente (API enfermería) para el modal del dashboard.
 */
@Injectable()
export class NurseDashboardPatientDetailsLoadFacade {
  private readonly nurseService = inject(NurseService);

  loadDetails(patientId: number): Observable<PatientDetail> {
    return this.nurseService.getPatientDetails(patientId);
  }
}
