import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  NurseService,
  type HandoverShiftSlot,
  type ShiftHandoverNoteDto,
} from '../../../services/nurse.service';

/**
 * Lectura y guardado de notas de entrega (turno anterior) para el panel enfermería.
 */
@Injectable()
export class NurseDashboardHandoverNoteFacade {
  private readonly nurseService = inject(NurseService);

  fetchNote(date: string, shift: HandoverShiftSlot): Observable<{ note: ShiftHandoverNoteDto | null }> {
    return this.nurseService.getHandoverNote(date, shift);
  }

  saveNote(
    noteDate: string,
    body: string,
    shift: HandoverShiftSlot
  ): Observable<{ note: ShiftHandoverNoteDto }> {
    return this.nurseService.putHandoverNote(noteDate, body, shift);
  }
}
