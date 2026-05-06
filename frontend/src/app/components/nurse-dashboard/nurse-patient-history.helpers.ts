import type { TreatmentRecord } from './nurse-treatment-record.model';
import { nurseUiEmDash } from './nurse-dashboard-ui-i18n.helpers';

export type HistoryPeriodFilter = 'all' | 'today' | 'week' | 'month';
export type HistoryOutcomeFilter = 'all' | 'done' | 'postponed' | 'not_done';

export function parseHistoryRecordDate(r: TreatmentRecord): Date {
  const dateStr = r.date || '';
  const timeStr = r.time || '00:00';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    const tp = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (tp) {
      d.setHours(+tp[1], +tp[2], 0, 0);
    }
    return d;
  }
  return new Date(0);
}

export function filterTreatmentHistoryByPeriodAndOutcome(
  records: TreatmentRecord[],
  historyFilter: HistoryPeriodFilter,
  historyOutcomeFilter: HistoryOutcomeFilter
): TreatmentRecord[] {
  if (!records.length) {
    return [];
  }

  let filtered = [...records];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setMinutes(0, 0, 0);

  switch (historyFilter) {
    case 'today': {
      const todayStr = now.toLocaleDateString('es-ES');
      filtered = filtered.filter((r) => {
        if (!r.date) {
          return false;
        }
        const recordDateStr = r.date.trim();
        return recordDateStr === todayStr;
      });
      break;
    }
    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      filtered = filtered.filter((r) => {
        if (!r.date) {
          return false;
        }
        try {
          const parts = r.date.split('/');
          if (parts.length === 3) {
            const recordDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            recordDate.setHours(0, 0, 0, 0);
            return recordDate >= weekAgo;
          }
        } catch {
          /* ignorar fila mal formada */
        }
        return false;
      });
      break;
    }
    case 'month': {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      monthAgo.setHours(0, 0, 0, 0);
      filtered = filtered.filter((r) => {
        if (!r.date) {
          return false;
        }
        try {
          const parts = r.date.split('/');
          if (parts.length === 3) {
            const recordDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            recordDate.setHours(0, 0, 0, 0);
            return recordDate >= monthAgo;
          }
        } catch {
          /* ignorar */
        }
        return false;
      });
      break;
    }
    case 'all':
    default:
      break;
  }

  switch (historyOutcomeFilter) {
    case 'done':
      filtered = filtered.filter((r) => r.status === 'administered');
      break;
    case 'postponed':
      filtered = filtered.filter((r) => r.status === 'postponed' || r.source === 'postpone');
      break;
    case 'not_done':
      filtered = filtered.filter((r) => r.status === 'missed' || r.status === 'not_administered');
      break;
    default:
      break;
  }

  return filtered;
}

export function sortTreatmentHistoryDescending(records: TreatmentRecord[]): TreatmentRecord[] {
  return records.slice().sort((a, b) => parseHistoryRecordDate(b).getTime() - parseHistoryRecordDate(a).getTime());
}

export function historyRecordStatusLabel(r: TreatmentRecord): string {
  if (r.status === 'administered') {
    return $localize`:@@nursePatientHistory.record.status.administered:Realizado`;
  }
  if (r.status === 'postponed' || r.source === 'postpone') {
    return $localize`:@@nursePatientHistory.record.status.postponed:Pospuesto`;
  }
  if (r.status === 'missed') {
    return $localize`:@@nursePatientHistory.record.status.missed:Omitido`;
  }
  if (r.status === 'not_administered') {
    return $localize`:@@nursePatientHistory.record.status.notAdministered:No realizado`;
  }
  return r.status || nurseUiEmDash();
}

export function historyNotesBlockVisible(r: TreatmentRecord): boolean {
  return !!(
    r.scheduledTimePlanned ||
    r.notes ||
    r.reasonNotAdministered ||
    (r.administeredAt && r.status === 'administered')
  );
}

export function historyNotesPreview(record: TreatmentRecord): string {
  const bits: string[] = [];
  if (record.reasonNotAdministered?.trim()) {
    bits.push(record.reasonNotAdministered.trim());
  }
  if (record.notes?.trim()) {
    bits.push(record.notes.trim());
  }
  let s = bits.join(' · ');
  if (!s && record.scheduledTimePlanned) {
    const planWord = $localize`:@@nursePatientHistory.preview.planWord:Plan`;
    s = `${planWord}: ${record.scheduledTimePlanned}`;
  }
  if (!s && record.administeredAt && record.status === 'administered') {
    const recordWord = $localize`:@@nursePatientHistory.preview.recordWord:Registro`;
    s = `${recordWord}: ${record.administeredAt}`;
  }
  if (!s) {
    return nurseUiEmDash();
  }
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}
