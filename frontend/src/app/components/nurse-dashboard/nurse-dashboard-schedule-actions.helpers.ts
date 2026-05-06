import type { NurseScheduleEditContext } from './nurse-schedule-edit-modal/nurse-schedule-edit-modal.component';

export function parseSelectedPatientId(selectedPatient: { id: string } | null): number | null {
  if (!selectedPatient) return null;
  const id = Number.parseInt(selectedPatient.id, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function buildScheduleEditContextFromItem(
  item: { scheduleId?: number; description?: string; notes?: string; notCompletedReason?: string } | null
): NurseScheduleEditContext | null {
  const scheduleId = item?.scheduleId;
  if (!scheduleId) {
    return null;
  }
  return {
    scheduleId,
    description: item?.description || '',
    notes: item?.notes || item?.notCompletedReason || '',
  };
}

export function canDeletePendingScheduleItem(item: {
  completed?: boolean;
  notCompleted?: boolean;
  cancelled?: boolean;
}): boolean {
  return !item.completed && !item.notCompleted && !item.cancelled;
}
