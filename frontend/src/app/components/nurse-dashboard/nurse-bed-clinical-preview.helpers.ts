import type { PatientClinicalNoteDto } from '../../services/nurse.service';
import { buildEffectiveClinicalNotes } from '../../shared/utils/clinical-notes-display.helpers';

export function bedClinicalNotesCount(
  notesFromApi: PatientClinicalNoteDto[] | undefined,
  legacySingleFieldText: string
): number {
  return buildEffectiveClinicalNotes(notesFromApi, legacySingleFieldText).length;
}
