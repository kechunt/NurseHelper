import type { TreatmentTodayItem } from './treatment-today-item.model';
import { nurseUiEmDash } from './nurse-dashboard-ui-i18n.helpers';

export function sortTreatmentsTodaySlots(
  list: TreatmentTodayItem[] | undefined | null
): TreatmentTodayItem[] {
  if (!list?.length) {
    return [];
  }
  return [...list].sort(
    (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
  );
}

export function treatmentSlotPending(slot: TreatmentTodayItem): boolean {
  return slot.status === 'pending' && !slot.completed && !slot.cancelled;
}

export function treatmentSlotStatusLabel(slot: TreatmentTodayItem): string {
  if (slot.status === 'completed' || slot.completed) {
    return 'Realizado';
  }
  if (slot.status === 'cancelled' || slot.cancelled) {
    return 'Cancelado';
  }
  if (slot.status === 'missed' || slot.notCompleted) {
    return 'No realizado';
  }
  if (slot.status === 'pending') {
    return 'Pendiente';
  }
  return String(slot.status || '—');
}

/** Etiqueta UI para `scheduleType` (tabla del día y modal de horarios). */
export function treatmentTypeLabel(st: string): string {
  if (st === 'check') {
    return $localize`:@@nurseTreatment.todaySlot.type.check:Chequeo`;
  }
  if (st === 'treatment') {
    return $localize`:@@nurseTreatment.todaySlot.type.treatment:Tratamiento`;
  }
  return $localize`:@@nurseTreatment.todaySlot.type.other:Otro`;
}
