import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NurseService } from '../../../services/nurse.service';

/**
 * Marcar tarea no completada y posponer horario (API schedules).
 */
@Injectable()
export class NurseDashboardTaskLifecycleFacade {
  private readonly nurseService = inject(NurseService);

  markNotCompleted(taskId: number, reason: string): Observable<unknown> {
    return this.nurseService.markTaskAsNotCompleted(taskId, reason);
  }

  postpone(taskId: number, newTimeIso: string): Observable<unknown> {
    return this.nurseService.postponeTask(taskId, newTimeIso);
  }
}
