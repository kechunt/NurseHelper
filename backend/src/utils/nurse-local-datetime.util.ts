/** Interpreta `YYYY-MM-DD` + `HH:mm` en hora local del servidor (evita desfaces de ISO/UTC). */
export function parseLocalDateTimeParts(dateStr: string, timeStr: string): Date {
  const [Y, Mo, D] = String(dateStr)
    .trim()
    .split('-')
    .map((x) => parseInt(x, 10));
  const t = String(timeStr).trim();
  const [hRaw, miRaw] = t.split(':');
  const h = parseInt(hRaw, 10) || 0;
  const mi = parseInt(miRaw || '0', 10) || 0;
  return new Date(Y, Mo - 1, D, h, mi, 0, 0);
}
