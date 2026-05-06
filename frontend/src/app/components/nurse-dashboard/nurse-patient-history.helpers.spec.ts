import {
  filterTreatmentHistoryByPeriodAndOutcome,
  historyNotesBlockVisible,
  historyNotesPreview,
  historyRecordStatusLabel,
  parseHistoryRecordDate,
  sortTreatmentHistoryDescending,
} from './nurse-patient-history.helpers';
import type { TreatmentRecord } from './nurse-treatment-record.model';

function ensureLocalizeShim(): void {
  const g = globalThis as any;
  if (typeof g.$localize === 'function') {
    return;
  }
  g.$localize = (strings: TemplateStringsArray, ...expr: unknown[]) =>
    strings.reduce((acc, rawPart, idx) => {
      const part = idx === 0 ? rawPart.replace(/^:.*?:/, '') : rawPart;
      return acc + part + (idx < expr.length ? String(expr[idx]) : '');
    }, '');
}

beforeAll(() => ensureLocalizeShim());

describe('nurse-patient-history.helpers', () => {
  describe('parseHistoryRecordDate', () => {
    it('parsea fecha dd/mm/yyyy y hora HH:mm', () => {
      const d = parseHistoryRecordDate({
        date: '10/5/2026',
        time: '14:30',
      } as TreatmentRecord);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(4);
      expect(d.getDate()).toBe(10);
      expect(d.getHours()).toBe(14);
      expect(d.getMinutes()).toBe(30);
    });

    it('devuelve epoch si la fecha es inválida', () => {
      const d = parseHistoryRecordDate({
        date: 'xx',
        time: '00:00',
      } as TreatmentRecord);
      expect(d.getTime()).toBe(0);
    });
  });

  describe('historyRecordStatusLabel', () => {
    it('mapea estados y fuente posponer', () => {
      expect(historyRecordStatusLabel({ status: 'administered' } as TreatmentRecord)).toBe('Realizado');
      expect(historyRecordStatusLabel({ status: 'postponed' } as TreatmentRecord)).toBe('Pospuesto');
      expect(historyRecordStatusLabel({ status: 'missed' } as TreatmentRecord)).toBe('Omitido');
      expect(historyRecordStatusLabel({ status: 'not_administered' } as TreatmentRecord)).toBe('No realizado');
      expect(historyRecordStatusLabel({ source: 'postpone' } as TreatmentRecord)).toBe('Pospuesto');
    });

    it('devuelve status o guión si no hay mapeo', () => {
      expect(
        historyRecordStatusLabel({
          date: '',
          time: '',
          type: '',
          nurseName: '',
          description: '',
          status: 'pending' as unknown as TreatmentRecord['status'],
        })
      ).toBe('pending');
      expect(
        historyRecordStatusLabel({
          date: '',
          time: '',
          type: '',
          nurseName: '',
          description: '',
        } as TreatmentRecord)
      ).toBe('—');
    });
  });

  describe('historyNotesBlockVisible', () => {
    it('true si hay plan, notas, motivo o registro administrado', () => {
      expect(historyNotesBlockVisible({ scheduledTimePlanned: '08:00' } as TreatmentRecord)).toBe(true);
      expect(historyNotesBlockVisible({ notes: 'n' } as TreatmentRecord)).toBe(true);
      expect(historyNotesBlockVisible({ reasonNotAdministered: 'x' } as TreatmentRecord)).toBe(true);
      expect(
        historyNotesBlockVisible({
          administeredAt: '2026-05-01',
          status: 'administered',
        } as TreatmentRecord)
      ).toBe(true);
    });

    it('false si no hay contenido relevante', () => {
      expect(historyNotesBlockVisible({} as TreatmentRecord)).toBe(false);
    });
  });

  describe('historyNotesPreview', () => {
    it('prioriza motivo y luego notas', () => {
      expect(
        historyNotesPreview({
          reasonNotAdministered: 'Motivo',
          notes: 'Notas',
        } as TreatmentRecord)
      ).toBe('Motivo · Notas');
    });

    it('usa plan o registro si no hay motivo ni notas', () => {
      expect(historyNotesPreview({ scheduledTimePlanned: '09:00' } as TreatmentRecord)).toBe('Plan: 09:00');
      expect(
        historyNotesPreview({
          administeredAt: '2026-05-01 10:00',
          status: 'administered',
        } as TreatmentRecord)
      ).toBe('Registro: 2026-05-01 10:00');
    });

    it('trunca notas largas con elipsis (máx. ~80 visibles: 77 + …)', () => {
      const long = 'a'.repeat(100);
      const preview = historyNotesPreview({ notes: long } as TreatmentRecord);
      expect(preview.endsWith('…')).toBe(true);
      expect(preview.length).toBe(78);
    });

    it('devuelve guión si no hay texto', () => {
      expect(historyNotesPreview({} as TreatmentRecord)).toBe('—');
    });
  });

  describe('sortTreatmentHistoryDescending', () => {
    it('ordena por fecha/hora descendente', () => {
      const a: TreatmentRecord = { date: '1/5/2026', time: '10:00' } as TreatmentRecord;
      const b: TreatmentRecord = { date: '2/5/2026', time: '10:00' } as TreatmentRecord;
      const sorted = sortTreatmentHistoryDescending([a, b]);
      expect(sorted[0]).toBe(b);
      expect(sorted[1]).toBe(a);
    });
  });

  describe('filterTreatmentHistoryByPeriodAndOutcome', () => {
    beforeEach(() => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2026, 4, 15, 12, 0, 0));
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    const base: TreatmentRecord[] = [
      { date: '15/5/2026', time: '08:00', status: 'administered' } as TreatmentRecord,
      { date: '10/5/2026', time: '09:00', status: 'postponed' } as TreatmentRecord,
      { date: '25/4/2026', time: '10:00', status: 'administered' } as TreatmentRecord,
    ];

    it('periodo all y filtro outcome', () => {
      expect(filterTreatmentHistoryByPeriodAndOutcome(base, 'all', 'all').length).toBe(3);
      expect(filterTreatmentHistoryByPeriodAndOutcome(base, 'all', 'done').length).toBe(2);
      expect(filterTreatmentHistoryByPeriodAndOutcome(base, 'all', 'postponed').length).toBe(1);
    });

    it('periodo today solo incluye el día actual', () => {
      const today = filterTreatmentHistoryByPeriodAndOutcome(base, 'today', 'all');
      expect(today.length).toBe(1);
      expect(today[0].date).toBe('15/5/2026');
    });

    it('periodo week excluye registros anteriores a 7 días', () => {
      const week = filterTreatmentHistoryByPeriodAndOutcome(base, 'week', 'all');
      expect(week.some((r) => r.date === '25/4/2026')).toBe(false);
      expect(week.length).toBe(2);
    });

    it('periodo month incluye registros desde hace un mes calendario', () => {
      const month = filterTreatmentHistoryByPeriodAndOutcome(base, 'month', 'all');
      expect(month.some((r) => r.date === '25/4/2026')).toBe(true);
    });

    it('not_done agrupa missed y not_administered', () => {
      const rows: TreatmentRecord[] = [
        { date: '15/5/2026', time: '08:00', status: 'missed' } as TreatmentRecord,
        { date: '15/5/2026', time: '09:00', status: 'not_administered' } as TreatmentRecord,
        { date: '15/5/2026', time: '10:00', status: 'administered' } as TreatmentRecord,
      ];
      const nd = filterTreatmentHistoryByPeriodAndOutcome(rows, 'all', 'not_done');
      expect(nd.length).toBe(2);
    });
  });
});
