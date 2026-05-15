import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NurseService } from '../../../services/nurse.service';

/**
 * Alta de medicación y de tratamiento/tarea desde modales (`POST` API enfermería).
 */
@Injectable()
export class NurseDashboardPatientCareCreateFacade {
  private readonly nurseService = inject(NurseService);

  addMedication(data: Parameters<NurseService['addMedication']>[0]): Observable<unknown> {
    return this.nurseService.addMedication(data);
  }

  addTreatment(data: Parameters<NurseService['addTreatment']>[0]): Observable<unknown> {
    return this.nurseService.addTreatment(data);
  }
}
