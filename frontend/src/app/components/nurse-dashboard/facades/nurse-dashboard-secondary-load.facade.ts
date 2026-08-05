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

  loadBundle(refresh = false) {
    return forkJoin({
      tasks: this.nurseService.getTodayTasks(refresh),
      medications: this.nurseService.getMedicationsForPharmacy(refresh),
      shiftContext: this.nurseService.getShiftContext(refresh).pipe(catchError(() => of(null))),
    });
  }
}
