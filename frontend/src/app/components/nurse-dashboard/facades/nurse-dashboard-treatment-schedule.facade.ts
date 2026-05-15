import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NurseService } from '../../../services/nurse.service';

export type NurseTreatmentSchedulePatchBody = {
  action: 'accept' | 'postpone' | 'cancel';
  newScheduledTime?: string;
  notes?: string;
};

/**
 * Aceptar / posponer / cancelar tratamiento (no medicación) vía treatment-schedules.
 */
@Injectable()
export class NurseDashboardTreatmentScheduleFacade {
  private readonly nurseService = inject(NurseService);

  patchAction(
    patientId: number,
    scheduleId: number,
    body: NurseTreatmentSchedulePatchBody
  ): Observable<unknown> {
    return this.nurseService.patchTreatmentScheduleAction(patientId, scheduleId, body);
  }
}
