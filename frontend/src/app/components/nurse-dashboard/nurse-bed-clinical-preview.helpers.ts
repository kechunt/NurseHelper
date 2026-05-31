import type { PatientClinicalNoteDto } from '../../services/nurse.service';
import {
  clinicalNotesPreviewSlice,
  loadClinicalPins,
  type ClinicalNotesPinScope,
} from './nurse-clinical-notes-pin.helpers';
import { buildEffectiveClinicalNotes } from '../../shared/utils/clinical-notes-display.helpers';

export function bedClinicalPreviewLines(
  patientId: string,
  scope: ClinicalNotesPinScope,
  notesFromApi: PatientClinicalNoteDto[] | undefined,
  legacySingleFieldText: string
): string[] {
  const notes = buildEffectiveClinicalNotes(notesFromApi, legacySingleFieldText);
  const pinned = clinicalNotesPreviewSlice(notes, loadClinicalPins(patientId, scope), scope);
  return pinned.map((n) => n.body).filter((b) => b.length > 0);
}

export function bedClinicalNotesCount(
  notesFromApi: PatientClinicalNoteDto[] | undefined,
  legacySingleFieldText: string
): number {
  return buildEffectiveClinicalNotes(notesFromApi, legacySingleFieldText).length;
}

/** @deprecated Use buildEffectiveClinicalNotes from shared utils */
export { buildEffectiveClinicalNotes as buildBedClinicalEffectiveNotes } from '../../shared/utils/clinical-notes-display.helpers';
