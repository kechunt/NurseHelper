import type { TreatmentRecord } from './nurse-treatment-record.model';

export function openHistoryEditState(record: TreatmentRecord): TreatmentRecord {
  return record;
}

export function closeHistoryEditState(): null {
  return null;
}

export function openHistoryDetailState(record: TreatmentRecord): TreatmentRecord {
  return record;
}

export function closeHistoryDetailState(): null {
  return null;
}
