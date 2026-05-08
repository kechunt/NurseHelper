import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AdminService } from './admin.service';
import { AdminNursePickModalService } from './admin-nurse-pick-modal.service';

/**
 * Asignación paciente → cama con elección de enfermera si el área tiene más de una.
 */
@Injectable({ providedIn: 'root' })
export class AdminPatientBedAssignmentService {
  constructor(
    private readonly admin: AdminService,
    private readonly nursePick: AdminNursePickModalService
  ) {}

  assignPatientToBed(opts: {
    bedId: number;
    patientId: number;
    areaId: number | null | undefined;
    patientHint: string;
  }): Observable<unknown> {
    const areaId = opts.areaId;
    if (areaId == null || Number.isNaN(Number(areaId))) {
      return this.admin.assignPatientToBed(opts.bedId, opts.patientId);
    }

    return this.nursePick.pickNurseOutcome(Number(areaId), opts.patientHint).pipe(
      switchMap((outcome) => {
        if (outcome.kind === 'cancelled') {
          return EMPTY;
        }
        return this.admin.assignPatientToBed(opts.bedId, opts.patientId, outcome.nurseId);
      })
    );
  }
}
