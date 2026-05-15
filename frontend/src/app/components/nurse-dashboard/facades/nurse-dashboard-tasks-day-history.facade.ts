import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NurseService, type NurseDayHistoryResponse } from '../../../services/nurse.service';

/**
 * Carga del historial de tareas del día (panel enfermería).
 */
@Injectable()
export class NurseDashboardTasksDayHistoryFacade {
  private readonly nurseService = inject(NurseService);

  loadHistory(date: string): Observable<NurseDayHistoryResponse> {
    return this.nurseService.getTasksDayHistory(date);
  }
}
