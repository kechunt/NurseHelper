import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NurseService } from '../../../services/nurse.service';

export type NurseAdministrationHistoryPatchBody = {
  notes?: string;
  reasonNotAdministered?: string;
  description?: string;
  status?: 'administered' | 'not_administered' | 'missed';
};

export type NursePatientSchedulePatchBody = {
  description?: string;
  notes?: string;
  scheduledTime?: string;
  status?: string;
};

/**
 * Parches de historial de administración y de horarios del paciente (modales edición).
 */
@Injectable()
export class NurseDashboardPatientRecordPatchFacade {
  private readonly nurseService = inject(NurseService);

  patchAdministrationHistory(
    patientId: number,
    historyId: number,
    body: NurseAdministrationHistoryPatchBody
  ): Observable<unknown> {
    return this.nurseService.patchAdministrationHistory(patientId, historyId, body);
  }

  patchPatientSchedule(
    patientId: number,
    scheduleId: number,
    body: NursePatientSchedulePatchBody
  ): Observable<unknown> {
    return this.nurseService.patchPatientSchedule(patientId, scheduleId, body);
  }
}
