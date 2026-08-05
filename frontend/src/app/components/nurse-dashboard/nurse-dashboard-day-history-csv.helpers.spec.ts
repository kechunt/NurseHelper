import {
  mapNurseDayHistoryItemsToCsvRows,
  tasksDayHistoryCsvFilename,
} from './nurse-dashboard-day-history-csv.helpers';

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

describe('tasksDayHistoryCsvFilename', () => {
  it('incluye la fecha en el nombre del archivo', () => {
    expect(tasksDayHistoryCsvFilename('2026-05-03')).toBe('historial-dia-2026-05-03.csv');
  });
});

describe('mapNurseDayHistoryItemsToCsvRows', () => {
  it('devuelve array vacío con null, undefined o lista vacía', () => {
    expect(mapNurseDayHistoryItemsToCsvRows('2026-05-03', null)).toEqual([]);
    expect(mapNurseDayHistoryItemsToCsvRows('2026-05-03', undefined)).toEqual([]);
    expect(mapNurseDayHistoryItemsToCsvRows('2026-05-03', [])).toEqual([]);
  });

  it('mapea campos y resultado según completada / no realizada / estado', () => {
    const rows = mapNurseDayHistoryItemsToCsvRows('2026-05-03', [
      {
        time: '08:00',
        type: 'medication',
        patientName: 'Ana',
        bedNumber: '1',
        description: 'Dosis',
        medication: 'X',
        dosage: '1',
        completed: true,
        missed: false,
        status: 'pendiente',
        recordedAtTime: '08:05',
      },
      {
        time: '09:00',
        type: 'check',
        patientName: 'Luis',
        bedNumber: '2',
        description: 'Chequeo',
        medication: null,
        dosage: null,
        completed: false,
        missed: true,
        status: 'pendiente',
        recordedAtTime: null,
      },
      {
        time: '10:00',
        type: 'treatment',
        patientName: 'Bea',
        bedNumber: '3',
        description: 'Curación',
        medication: undefined,
        dosage: undefined,
        completed: false,
        missed: false,
        status: 'En curso',
        recordedAtTime: '',
      },
    ]);
    expect(rows.length).toBe(3);
    expect(rows[0].Fecha).toBe('2026-05-03');
    expect(rows[0].Tipo).toBe('Medicamento');
    expect(rows[0].Resultado).toBe('Completada');
    expect(rows[0].Medicamento).toBe('X');
    expect(rows[0].HoraRegistro).toBe('08:05');
    expect(rows[1].Tipo).toBe('Control');
    expect(rows[1].Resultado).toBe('No realizada');
    expect(rows[1].Medicamento).toBe('');
    expect(rows[1].HoraRegistro).toBe('');
    expect(rows[2].Tipo).toBe('Tratamiento');
    expect(rows[2].Resultado).toBe('En curso');
  });
});
