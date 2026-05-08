import type { PatientClinicalNoteDto } from '../../services/nurse.service';
import {
  clinicalNoteDisplayBody,
  clinicalNotesPreviewSlice,
  loadClinicalPins,
  saveClinicalPins,
  stableKeyForClinicalNote,
  toggleClinicalPin,
} from './nurse-clinical-notes-pin.helpers';

describe('nurse-clinical-notes-pin.helpers', () => {
  const scope = 'medical' as const;

  beforeEach(() => {
    saveClinicalPins('p1', scope, []);
  });

  it('clinicalNoteDisplayBody oculta prefijo tipo [timestamp]', () => {
    expect(clinicalNoteDisplayBody('[2024-01-02] Hola')).toBe('Hola');
    expect(clinicalNoteDisplayBody('Sin prefijo')).toBe('Sin prefijo');
  });

  it('sin pins la vista compacta está vacía (0 notas)', () => {
    const notes: PatientClinicalNoteDto[] = [
      { id: 1, body: 'A', authorName: null, createdAt: '2020-01-01T10:00:00Z', legacy: false },
      { id: 2, body: 'B', authorName: null, createdAt: '2021-01-01T10:00:00Z', legacy: false },
    ];
    expect(clinicalNotesPreviewSlice(notes, [], scope)).toEqual([]);
  });

  it('con visibles solo muestra las marcadas (en orden guardado)', () => {
    const notes: PatientClinicalNoteDto[] = [
      { id: 1, body: 'A', authorName: null, createdAt: '2020-01-01T10:00:00Z', legacy: false },
      { id: 2, body: 'B', authorName: null, createdAt: '2021-01-01T10:00:00Z', legacy: false },
      { id: 3, body: 'C', authorName: null, createdAt: '2022-01-01T10:00:00Z', legacy: false },
    ];
    const k2 = stableKeyForClinicalNote(notes[1], scope);
    saveClinicalPins('p2', scope, [k2]);
    const pinned = loadClinicalPins('p2', scope);
    const prev = clinicalNotesPreviewSlice(notes, pinned, scope);
    expect(prev.length).toBe(1);
    expect(prev[0].body).toBe('B');
  });

  it('toggleClinicalPin acumula como máximo 3 claves', () => {
    saveClinicalPins('p3', scope, []);
    ['a', 'b', 'c', 'd'].forEach((k) => toggleClinicalPin('p3', scope, k));
    expect(loadClinicalPins('p3', scope)).toEqual(['b', 'c', 'd']);
  });
});
