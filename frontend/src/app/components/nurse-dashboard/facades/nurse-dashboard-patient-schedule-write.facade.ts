import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NurseService } from '../../../services/nurse.service';

/**
 * Borrado de horarios del paciente (`DELETE .../schedules/:id`).
 */
@Injectable()
export class NurseDashboardPatientScheduleWriteFacade {
  private readonly nurseService = inject(NurseService);

  deleteSchedule(patientId: number, scheduleId: number): Observable<unknown> {
    return this.nurseService.deletePatientSchedule(patientId, scheduleId);
  }
}
