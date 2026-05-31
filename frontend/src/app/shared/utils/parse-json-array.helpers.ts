/** Parsea JSON array de forma segura; devuelve [] si falla o no es array. */
export function parseJsonArraySafe<T>(raw: unknown): T[] {
  if (raw == null || raw === '') {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw as T[];
  }
  if (typeof raw !== 'string') {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}
