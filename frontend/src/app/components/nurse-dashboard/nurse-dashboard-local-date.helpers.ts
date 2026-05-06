const ISO_YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fecha civil **local** en formato `YYYY-MM-DD` (p. ej. consulta historial del día en API).
 */
export function formatLocalDateIsoYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** `true` si la cadena (tras `trim`) coincide con `YYYY-MM-DD` (solo forma, no validez calendario). */
export function isValidIsoYmdDateString(value: string | null | undefined): boolean {
  return ISO_YMD_REGEX.test((value || '').trim());
}
