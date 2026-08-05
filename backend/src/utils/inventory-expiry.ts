/** Ventana "por caducar" (días inclusivos desde hoy). */
export const EXPIRING_SOON_DAYS = 30;

export type ExpiryClassification = 'none' | 'expired' | 'expiring_soon';

type Ymd = { y: number; m: number; d: number };

function parseYmd(value: unknown): Ymd | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    // DATE de MySQL suele llegar como UTC medianoche; usar UTC evita desfase por zona horaria.
    return { y: value.getUTCFullYear(), m: value.getUTCMonth(), d: value.getUTCDate() };
  }
  if (typeof value === 'string') {
    const part = value.slice(0, 10);
    const m = part.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!y || !mo || !d) return null;
    return { y, m: mo - 1, d };
  }
  return null;
}

function todayYmdUtc(): Ymd {
  const n = new Date();
  return { y: n.getUTCFullYear(), m: n.getUTCMonth(), d: n.getUTCDate() };
}

function ymdToUtcMidnight(ymd: Ymd): number {
  return Date.UTC(ymd.y, ymd.m, ymd.d);
}

/**
 * Clasifica la caducidad usando solo la fecha de calendario (columna `expiryDate` / medications).
 * Hasta que exista tabla de lotes, un solo vencimiento por SKU es la fuente de verdad.
 */
export function classifyMedicationExpiry(expiryDate: unknown): ExpiryClassification {
  const exp = parseYmd(expiryDate);
  if (!exp) return 'none';
  const today = todayYmdUtc();
  const diffDays = (ymdToUtcMidnight(exp) - ymdToUtcMidnight(today)) / 86400000;
  if (diffDays < 0) return 'expired';
  if (diffDays <= EXPIRING_SOON_DAYS) return 'expiring_soon';
  return 'none';
}

/** Días hasta caducidad (negativo = ya vencido). null si no hay fecha. */
export function daysToExpiry(expiryDate: unknown): number | null {
  const exp = parseYmd(expiryDate);
  if (!exp) return null;
  const today = todayYmdUtc();
  return Math.round((ymdToUtcMidnight(exp) - ymdToUtcMidnight(today)) / 86400000);
}
