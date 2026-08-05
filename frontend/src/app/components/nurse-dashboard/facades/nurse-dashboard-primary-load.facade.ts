import { Injectable, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { NurseService } from '../../../services/nurse.service';

/**
 * Carga inicial del panel enfermería: estadísticas, camas y pacientes asignados.
 */
@Injectable()
export class NurseDashboardPrimaryLoadFacade {
  private readonly nurseService = inject(NurseService);

  loadPrimaryBundle(refresh = false) {
    return forkJoin({
      stats: this.nurseService.getNurseStats(refresh),
      beds: this.nurseService.getMyBeds(refresh),
      patients: this.nurseService.getMyPatients(undefined, refresh),
    });
  }
}
