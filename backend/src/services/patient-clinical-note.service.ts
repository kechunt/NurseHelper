import { AppDataSource } from '../data-source';
import { PatientClinicalNote, PatientClinicalNoteCategory } from '../entities/PatientClinicalNote';

export type ObservationAppendScope =
  | 'general'
  | 'medical'
  | 'diagnosis'
  | 'allergies'
  | 'specialNeeds';

export interface MergedClinicalNoteDto {
  id: number | null;
  body: string;
  authorName: string | null;
  createdAt: string | null;
  legacy: boolean;
}

export function observationScopeToCategory(scope: ObservationAppendScope): PatientClinicalNoteCategory {
  switch (scope) {
    case 'diagnosis':
      return 'diagnosis';
    case 'medical':
      return 'medical';
    case 'allergies':
      return 'allergies';
    case 'specialNeeds':
      return 'specialNeeds';
    case 'general':
    default:
      return 'general';
  }
}

export async function insertPatientClinicalNote(params: {
  patientId: number;
  category: PatientClinicalNoteCategory;
  body: string;
  authorUserId: number;
}): Promise<PatientClinicalNote> {
  const repo = AppDataSource.getRepository(PatientClinicalNote);
  const row = repo.create({
    patientId: params.patientId,
    category: params.category,
    body: params.body,
    authorUserId: params.authorUserId,
  });
  return repo.save(row);
}

/** Prefijo `[dd/mm/yyyy, hh:mm:ss]` usado antes por saveObservation. */
function parseLegacyBracketTimestamp(inner: string): Date | null {
  const m = inner.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) {
    return null;
  }
  const d = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const y = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const s = Number(m[6]);
  const dt = new Date(y, mo, d, h, mi, s);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function legacyColumnLinesToMergedItems(columnText: string | null | undefined): MergedClinicalNoteDto[] {
  if (!columnText?.trim()) {
    return [];
  }
  return columnText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const bracket = line.match(/^\[([^\]]+)\]\s*(.*)$/);
      if (bracket) {
        const tsInner = bracket[1];
        const body = (bracket[2] || '').trim();
        const createdAt = parseLegacyBracketTimestamp(tsInner);
        return {
          id: null,
          body: body || tsInner,
          authorName: null,
          createdAt: createdAt ? createdAt.toISOString() : null,
          legacy: true,
        };
      }
      return {
        id: null,
        body: line,
        authorName: null,
        createdAt: null,
        legacy: true,
      };
    });
}

function sortMergedNotesDesc(a: MergedClinicalNoteDto, b: MergedClinicalNoteDto): number {
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (tb !== ta) {
    return tb - ta;
  }
  return (b.id ?? 0) - (a.id ?? 0);
}

/** Una línea para cabeceras (p. ej. modal medicación): todas las notas de diagnóstico unidas. */
export function buildDiagnosisHeaderLine(mergedDiagnosisNotes: MergedClinicalNoteDto[]): string {
  const bodies = mergedDiagnosisNotes
    .map((n) => (n.body ?? '').trim())
    .filter((b) => b.length > 0);
  if (bodies.length === 0) {
    return 'Sin diagnóstico';
  }
  return bodies.join(' · ');
}

export function mergeDbNotesWithLegacyColumn(
  dbNotes: PatientClinicalNote[],
  legacyColumn: string | null | undefined,
  category: PatientClinicalNoteCategory
): MergedClinicalNoteDto[] {
  const fromDb: MergedClinicalNoteDto[] = dbNotes
    .filter((r) => r.category === category)
    .map((r) => ({
      id: r.id,
      body: r.body,
      authorName: r.author ? `${r.author.firstName} ${r.author.lastName}`.trim() || null : null,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      legacy: false,
    }));

  const legacyItems = legacyColumnLinesToMergedItems(legacyColumn ?? undefined);
  const combined = [...fromDb, ...legacyItems];
  combined.sort(sortMergedNotesDesc);
  return combined;
}

export async function findClinicalNotesForPatient(patientId: number): Promise<PatientClinicalNote[]> {
  const repo = AppDataSource.getRepository(PatientClinicalNote);
  return repo.find({
    where: { patientId },
    relations: ['author'],
    order: { createdAt: 'DESC', id: 'DESC' },
  });
}
