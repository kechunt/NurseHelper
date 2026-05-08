import type { PatientClinicalNoteDto } from '../../services/nurse.service';

/** Ámbitos alineados con `clinicalNotes` del paciente y localStorage de destacadas. */
export type ClinicalNotesPinScope =
  | 'diagnosis'
  | 'medical'
  | 'allergies'
  | 'specialNeeds'
  | 'general';

const STORAGE_PREFIX = 'nh.clinicalPins.v1';
export const CLINICAL_NOTES_PREVIEW_MAX = 3;

function storageKey(patientId: string, scope: ClinicalNotesPinScope): string {
  return `${STORAGE_PREFIX}:${patientId}:${scope}`;
}

function hash32(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return String(h);
}

/** Clave estable por nota (para pins); las legacy sin id usan cuerpo + fecha ISO si existe. */
export function stableKeyForClinicalNote(
  note: PatientClinicalNoteDto,
  scope: ClinicalNotesPinScope
): string {
  if (note.id != null && Number.isFinite(Number(note.id))) {
    return `${scope}:id:${note.id}`;
  }
  const snippet = (note.body || '').slice(0, 160);
  const created = note.createdAt ?? '';
  return `${scope}:leg:${hash32(`${snippet}|${created}`)}`;
}

/** Texto en listados previos (sin hora embebida en líneas tipo `[...] texto`). */
export function clinicalNoteDisplayBody(body: string | undefined | null): string {
  const raw = (body || '').trim();
  if (!raw) {
    return '';
  }
  return raw.replace(/^\[[^\]]*\]\s*/, '').trim() || raw;
}

export function sortClinicalNotesNewestFirst(notes: PatientClinicalNoteDto[]): PatientClinicalNoteDto[] {
  return [...notes].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (tb !== ta) {
      return tb - ta;
    }
    return (b.body || '').localeCompare(a.body || '');
  });
}

/**
 * Vista compacta fuera del modal «Ver todas»: solo notas elegidas como visibles ahí.
 * - Sin selección: 0 líneas (min 0).
 * - Con selección: orden guardado, máximo `max` (3).
 */
export function clinicalNotesPreviewSlice(
  notes: PatientClinicalNoteDto[],
  pinnedKeys: readonly string[],
  scope: ClinicalNotesPinScope,
  max = CLINICAL_NOTES_PREVIEW_MAX
): PatientClinicalNoteDto[] {
  if (pinnedKeys.length === 0) {
    return [];
  }
  const keyOf = (n: PatientClinicalNoteDto) => stableKeyForClinicalNote(n, scope);
  const sorted = sortClinicalNotesNewestFirst(notes);
  const map = new Map(sorted.map((n) => [keyOf(n), n]));
  const out: PatientClinicalNoteDto[] = [];
  const used = new Set<string>();
  for (const pk of pinnedKeys) {
    const n = map.get(pk);
    if (!n) {
      continue;
    }
    const k = keyOf(n);
    if (used.has(k)) {
      continue;
    }
    out.push(n);
    used.add(k);
    if (out.length >= max) {
      break;
    }
  }
  return out;
}

export function loadClinicalPins(patientId: string, scope: ClinicalNotesPinScope): string[] {
  if (!patientId || typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(storageKey(patientId, scope));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

export function saveClinicalPins(
  patientId: string,
  scope: ClinicalNotesPinScope,
  keys: string[]
): void {
  if (!patientId || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(storageKey(patientId, scope), JSON.stringify(keys));
  } catch {
    /* omitido */
  }
}

/** Toggle pin; si ya hay 3, descarta la más antigua al añadir otra. */
export function toggleClinicalPin(patientId: string, scope: ClinicalNotesPinScope, noteKey: string): string[] {
  let pins = [...loadClinicalPins(patientId, scope)];
  const idx = pins.indexOf(noteKey);
  if (idx >= 0) {
    pins.splice(idx, 1);
  } else {
    pins.push(noteKey);
    while (pins.length > CLINICAL_NOTES_PREVIEW_MAX) {
      pins.shift();
    }
  }
  saveClinicalPins(patientId, scope, pins);
  return pins;
}
