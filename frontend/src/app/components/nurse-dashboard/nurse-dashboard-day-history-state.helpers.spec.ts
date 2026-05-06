import {
  finishNurseDayHistoryLoadErrorState,
  finishNurseDayHistoryLoadSuccessState,
  startNurseDayHistoryLoadState,
} from './nurse-dashboard-day-history-state.helpers';

describe('nurse-dashboard-day-history-state.helpers', () => {
  it('startNurseDayHistoryLoadState valida fecha ISO YMD', () => {
    const invalid = startNurseDayHistoryLoadState('bad-date');
    expect(invalid.loading).toBeFalse();
    expect(invalid.error).toBe('Fecha no válida');

    const ok = startNurseDayHistoryLoadState('2026-05-05');
    expect(ok.loading).toBeTrue();
    expect(ok.error).toBeNull();
    expect(ok.date).toBe('2026-05-05');
  });

  it('finishNurseDayHistoryLoadSuccessState usa fecha de respuesta solo si es válida', () => {
    const withDate = finishNurseDayHistoryLoadSuccessState('2026-05-01', {
      date: '2026-05-02',
      items: [{ id: 1 } as any],
    });
    expect(withDate.date).toBe('2026-05-02');
    expect(withDate.items.length).toBe(1);
    expect(withDate.loading).toBeFalse();

    const withoutValidDate = finishNurseDayHistoryLoadSuccessState('2026-05-01', {
      date: 'bad-date',
      items: [],
    });
    expect(withoutValidDate.date).toBe('2026-05-01');
  });

  it('finishNurseDayHistoryLoadErrorState limpia items y deja error', () => {
    const out = finishNurseDayHistoryLoadErrorState('2026-05-05', 'No se pudo cargar');
    expect(out.date).toBe('2026-05-05');
    expect(out.items).toEqual([]);
    expect(out.loading).toBeFalse();
    expect(out.error).toBe('No se pudo cargar');
  });
});
