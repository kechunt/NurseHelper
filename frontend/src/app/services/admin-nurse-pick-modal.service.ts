import { Injectable } from '@angular/core';
import { Observable, Subscriber, defer, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AdminService, AreasShiftCoverageNurse } from './admin.service';

export type AdminNursePickRow = Pick<AreasShiftCoverageNurse, 'id' | 'firstName' | 'lastName'>;

export type NursePickOutcome =
  | { kind: 'cancelled' }
  | { kind: 'ok'; nurseId?: number };

export interface AdminNursePickVm {
  open: boolean;
  nurses: AdminNursePickRow[];
  patientHint: string;
}

/**
 * Modal global (host en admin-dashboard): elegir enfermera cuando el área tiene más de una.
 */
@Injectable({ providedIn: 'root' })
export class AdminNursePickModalService {
  private pending: {
    subscriber: Subscriber<NursePickOutcome>;
    nurses: AdminNursePickRow[];
    patientHint: string;
  } | null = null;

  /** Estado para la plantilla del host. */
  vm: AdminNursePickVm = { open: false, nurses: [], patientHint: '' };

  selectedNurseId: number | null = null;

  constructor(private readonly admin: AdminService) {}

  pickNurseOutcome(areaId: number, patientHint: string): Observable<NursePickOutcome> {
    return this.admin.getNursesByArea(areaId).pipe(
      switchMap((nurses) => this.resolveNursePickOutcome(nurses, patientHint))
    );
  }

  /**
   * Misma lógica que `pickNurseOutcome` pero sin volver a pedir la lista (p. ej. asignación paciente–cama).
   */
  resolveNursePickOutcome(nurses: AdminNursePickRow[], patientHint: string): Observable<NursePickOutcome> {
    if (nurses.length <= 1) {
      return of<NursePickOutcome>({ kind: 'ok', nurseId: nurses[0]?.id });
    }
    return defer(
      () =>
        new Observable<NursePickOutcome>((subscriber) => {
          this.pending = { subscriber, nurses, patientHint };
          this.selectedNurseId = null;
          this.vm = { open: true, nurses: [...nurses], patientHint };
        })
    );
  }

  confirmSelection(): void {
    const p = this.pending;
    if (!p) return;
    const nid = this.selectedNurseId != null ? Number(this.selectedNurseId) : NaN;
    if (!Number.isFinite(nid)) {
      return;
    }
    p.subscriber.next({ kind: 'ok', nurseId: nid });
    p.subscriber.complete();
    this.resetUi();
  }

  cancelSelection(): void {
    const p = this.pending;
    if (!p) return;
    p.subscriber.next({ kind: 'cancelled' });
    p.subscriber.complete();
    this.resetUi();
  }

  private resetUi(): void {
    this.pending = null;
    this.selectedNurseId = null;
    this.vm = { open: false, nurses: [], patientHint: '' };
  }
}
