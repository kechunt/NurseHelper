import type { MedicationTodaySlot } from './medication-today-slot.model';
import { nurseUiEmDash } from './nurse-dashboard-ui-i18n.helpers';

export function sortMedicationsTodaySlots(
  list: MedicationTodaySlot[] | undefined | null
): MedicationTodaySlot[] {
  if (!list?.length) {
    return [];
  }
  return [...list].sort(
    (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
  );
}

export function medicationSlotPending(slot: MedicationTodaySlot): boolean {
  return slot.status === 'pending' && !slot.completed && !slot.cancelled;
}

export function medicationSlotStatusLabel(slot: MedicationTodaySlot): string {
  if (slot.status === 'completed' || slot.completed) {
    return $localize`:@@nurseMedication.todaySlot.status.administered:Administrado`;
  }
  if (slot.status === 'cancelled' || slot.cancelled) {
    return $localize`:@@nurseMedication.todaySlot.status.cancelled:Cancelado`;
  }
  if (slot.status === 'missed' || slot.notCompleted) {
    return $localize`:@@nurseMedication.todaySlot.status.notAdministered:No administrado`;
  }
  if (slot.status === 'pending') {
    return $localize`:@@nurseMedication.todaySlot.status.pending:Pendiente`;
  }
  return slot.status ? String(slot.status) : nurseUiEmDash();
}
