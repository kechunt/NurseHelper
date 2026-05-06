import {
  nurseUiEmDash,
  nurseWeekdaySelectOptionsMondayFirst,
  nurseWeekdayShortLabelsMondayFirst,
} from './nurse-dashboard-ui-i18n.helpers';

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

describe('nurse-dashboard-ui-i18n.helpers', () => {
  it('devuelve siete abreviaturas de día (lun–dom)', () => {
    expect(nurseWeekdayShortLabelsMondayFirst().length).toBe(7);
    expect(nurseWeekdayShortLabelsMondayFirst()[0]).toBe('Lun');
  });

  it('opciones selector alinean label y value inglés por defecto', () => {
    const opts = nurseWeekdaySelectOptionsMondayFirst();
    expect(opts[0]).toEqual({ label: 'Lun', value: 'monday' });
    expect(opts[6]?.value).toBe('sunday');
  });

  it('devuelve guión como marcador vacío', () => {
    expect(nurseUiEmDash()).toBe('—');
  });
});
