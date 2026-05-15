import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NurseService } from '../../../services/nurse.service';

/**
 * Borrado de filas del historial de administración (`DELETE .../administration-history/:id`).
 */
@Injectable()
export class NurseDashboardAdministrationHistoryWriteFacade {
  private readonly nurseService = inject(NurseService);

  deleteHistory(patientId: number, historyId: number): Observable<unknown> {
    return this.nurseService.deleteAdministrationHistory(patientId, historyId);
  }
}
