import type { PatientClinicalNoteDto } from '../../services/nurse.service';
import { clinicalNoteDisplayBody } from '../../components/nurse-dashboard/nurse-clinical-notes-pin.helpers';
import { splitObservationLines } from '../../components/nurse-dashboard/nurse-patient-observations.helpers';

/** Notas efectivas para preview/listado (API o texto legacy por líneas). */
export function buildEffectiveClinicalNotes(
  notesFromApi: PatientClinicalNoteDto[] | undefined,
  legacySingleFieldText: string
): PatientClinicalNoteDto[] {
  if (notesFromApi?.length) {
    return notesFromApi.map((note) => ({
      ...note,
      body: clinicalNoteDisplayBody(note.body) || (note.body || '').trim(),
    }));
  }
  return splitObservationLines(legacySingleFieldText).map((line) => {
    const trimmed = line.trim();
    return {
      id: null,
      body: clinicalNoteDisplayBody(trimmed) || trimmed,
      authorName: null,
      createdAt: null,
      legacy: true,
    };
  });
}
