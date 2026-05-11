import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AdminService } from './admin.service';
import { AdminNursePickModalService } from './admin-nurse-pick-modal.service';

/**
 * Asignación paciente → cama con elección de enfermera si el área tiene más de una.
 *
 * Importante: no encadenar el observable del modal con `switchMap` directamente sobre el HTTP.
 * Al confirmar enfermera, ese observable hace `next` + `complete` en el mismo turno; si el HTTP va
 * dentro de ese `switchMap`, RxJS cancela la petición al completar la fuente (la asignación falla
 * o queda a medias y los modales no cierran bien).
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

    const aid = Number(areaId);
    return this.admin.getNursesByArea(aid).pipe(
      switchMap((nurses) => {
        if (nurses.length <= 1) {
          return this.admin.assignPatientToBed(opts.bedId, opts.patientId, nurses[0]?.id);
        }

        return new Observable<unknown>((observer) => {
          const pickSub = this.nursePick.resolveNursePickOutcome(nurses, opts.patientHint).subscribe({
            next: (outcome) => {
              if (outcome.kind === 'cancelled') {
                observer.complete();
                return;
              }
              this.admin.assignPatientToBed(opts.bedId, opts.patientId, outcome.nurseId).subscribe({
                next: (v) => {
                  observer.next(v);
                  observer.complete();
                },
                error: (err) => observer.error(err),
              });
            },
            error: (err) => observer.error(err),
          });

          return () => {
            pickSub.unsubscribe();
            if (this.nursePick.vm.open) {
              this.nursePick.cancelSelection();
            }
          };
        });
      })
    );
  }
}
