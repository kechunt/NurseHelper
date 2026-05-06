/** Estado que abre `NurseScheduleSlotsModalComponent` (hoy / otras fechas + lista completa). */
export interface ScheduleSlotsModalViewPayload {
  kind: 'medication' | 'treatment';
  title: string;
  /** Notas/observaciones generales de la pauta (si existen). */
  notes?: string | null;
  today: any[];
  other: any[];
  allSlots: any[];
}

/**
 * Ordena slots por tiempo y los parte en «hoy» (día local) vs resto.
 * Devuelve `null` si no hay slots.
 */
export function buildScheduleSlotsViewPayload(
  kind: 'medication' | 'treatment',
  row: { name?: string; notes?: string | null; scheduleSlots?: any[] | null }
): ScheduleSlotsModalViewPayload | null {
  const slots = row?.scheduleSlots;
  if (!slots?.length) {
    return null;
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const chronological = [...slots].sort(
    (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
  );
  const today: any[] = [];
  const other: any[] = [];
  for (const s of chronological) {
    const t = new Date(s.scheduledTime).getTime();
    if (t >= start.getTime() && t < end.getTime()) {
      today.push(s);
    } else {
      other.push(s);
    }
  }
  return {
    kind,
    title: row.name ?? '',
    notes: row.notes ?? null,
    today,
    other,
    allSlots: chronological,
  };
}
