import {
  closeHistoryDetailState,
  closeHistoryEditState,
  openHistoryDetailState,
  openHistoryEditState,
} from './nurse-dashboard-history-modals.helpers';

describe('nurse-dashboard-history-modals.helpers', () => {
  it('open helpers retornan el registro recibido', () => {
    const record: any = { date: '2026-05-05', description: 'Dosis' };
    expect(openHistoryEditState(record)).toBe(record);
    expect(openHistoryDetailState(record)).toBe(record);
  });

  it('close helpers cierran a null', () => {
    expect(closeHistoryEditState()).toBeNull();
    expect(closeHistoryDetailState()).toBeNull();
  });
});
