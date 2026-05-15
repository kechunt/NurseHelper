import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NurseService } from '../../../services/nurse.service';

/**
 * Completar horario/tarea vía API enfermería (`PUT` completar administración u horario).
 */
@Injectable()
export class NurseDashboardCompleteTaskFacade {
  private readonly nurseService = inject(NurseService);

  completeByScheduleId(scheduleId: number): Observable<unknown> {
    return this.nurseService.completeTask(scheduleId);
  }
}
