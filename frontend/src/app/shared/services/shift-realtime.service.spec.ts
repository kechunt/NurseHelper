import { TestBed } from '@angular/core/testing';
import { ShiftRealtimeService } from './shift-realtime.service';

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

describe('ShiftRealtimeService', () => {
  beforeEach(() => ensureLocalizeShim());

  it('formatShiftLabel sin turno devuelve texto localizable', () => {
    const svc = TestBed.inject(ShiftRealtimeService);
    expect(svc.formatShiftLabel(null)).toContain('turno');
  });
});
