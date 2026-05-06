function nonEmptyString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

/**
 * Extrae un mensaje legible de respuestas de error típicas de Angular HttpClient
 * (`error.error.message`, `error.error` como string anidado, `error.message`).
 */
export function readNurseDashboardHttpErrorMessage(err: unknown, fallback: string): string {
  if (err == null || typeof err !== 'object') {
    return fallback;
  }
  const e = err as Record<string, unknown>;
  const inner = e['error'];
  if (inner != null && typeof inner === 'object') {
    const o = inner as Record<string, unknown>;
    const fromMessage = nonEmptyString(o['message']);
    if (fromMessage) {
      return fromMessage;
    }
    const fromNestedError = nonEmptyString(o['error']);
    if (fromNestedError) {
      return fromNestedError;
    }
  }
  if (typeof inner === 'string' && inner.trim() !== '') {
    return inner;
  }
  return nonEmptyString(e['message']) || fallback;
}
