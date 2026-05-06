import type { TreatmentRecord } from './nurse-treatment-record.model';

export type HistoryDeleteTarget =
  | { kind: 'history'; id: number }
  | { kind: 'schedule'; id: number }
  | null;

export function resolveHistoryDeleteTarget(record: TreatmentRecord): HistoryDeleteTarget {
  if (record.historyId) {
    return { kind: 'history', id: record.historyId };
  }
  if (record.scheduleId) {
    return { kind: 'schedule', id: record.scheduleId };
  }
  return null;
}

export function successMessageForHistoryDeleteTarget(target: Exclude<HistoryDeleteTarget, null>): string {
  return target.kind === 'history'
    ? $localize`:@@nurseDashboard.historyDelete.successHistoryRecord:Registro eliminado`
    : $localize`:@@nurseDashboard.historyDelete.successScheduleRow:Horario eliminado`;
}
