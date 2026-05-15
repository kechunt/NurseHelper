import { Injectable, inject } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NurseService } from '../../../services/nurse.service';

/**
 * Agrupa la carga secundaria del dashboard (tareas del día, medicación farmacia, contexto de turno).
 */
@Injectable()
export class NurseDashboardSecondaryLoadFacade {
  private readonly nurseService = inject(NurseService);

  loadBundle() {
    return forkJoin({
      tasks: this.nurseService.getTodayTasks(),
      medications: this.nurseService.getMedicationsForPharmacy(),
      shiftContext: this.nurseService.getShiftContext().pipe(catchError(() => of(null))),
    });
  }
}
