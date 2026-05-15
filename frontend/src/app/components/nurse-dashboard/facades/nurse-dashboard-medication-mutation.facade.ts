import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NurseService } from '../../../services/nurse.service';

/**
 * Suspender, eliminar y reactivar medicación del paciente vía API enfermería.
 */
@Injectable()
export class NurseDashboardMedicationMutationFacade {
  private readonly nurseService = inject(NurseService);

  suspend(
    patientId: number,
    medication: string,
    reason: string,
    suspendUntil?: Date
  ): Observable<unknown> {
    return this.nurseService.suspendMedication(patientId, medication, reason, suspendUntil);
  }

  deleteMedication(patientId: number, medication: string, reason: string): Observable<unknown> {
    return this.nurseService.deleteMedication(patientId, medication, reason);
  }

  reactivateMedication(patientId: number, medication: string): Observable<unknown> {
    return this.nurseService.reactivateMedication(patientId, medication);
  }
}
