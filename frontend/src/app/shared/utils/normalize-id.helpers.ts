/** Convierte id numérico/string a number finito o null. */
export function normalizeId(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}
