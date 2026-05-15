import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NurseService, type PatientDetail } from '../../../services/nurse.service';

/**
 * Búsqueda de pacientes asignados desde la cabecera del panel enfermería.
 */
@Injectable()
export class NurseDashboardMyPatientsSearchFacade {
  private readonly nurseService = inject(NurseService);

  /** Lista filtrada por término (delegación sobre `GET /nurse/patients?q=`). */
  searchByQuery(term: string): Observable<PatientDetail[]> {
    return this.nurseService.getMyPatients(term);
  }
}
