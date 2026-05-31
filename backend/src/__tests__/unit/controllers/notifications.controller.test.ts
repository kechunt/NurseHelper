import type { Response } from 'express';

const listActiveNotificationsForUser = jest.fn();
const markNotificationRead = jest.fn();
const markNotificationAcknowledged = jest.fn();
const markAllNotificationsRead = jest.fn();
const deleteNotificationForUser = jest.fn();
const bulkDeleteNotificationsForUser = jest.fn();
const deleteAllNotificationsForUser = jest.fn();

jest.mock('../../../services/user-notifications-persistence.service', () => ({
  listActiveNotificationsForUser: (...a: unknown[]) => listActiveNotificationsForUser(...a),
  markNotificationRead: (...a: unknown[]) => markNotificationRead(...a),
  markNotificationAcknowledged: (...a: unknown[]) => markNotificationAcknowledged(...a),
  markAllNotificationsRead: (...a: unknown[]) => markAllNotificationsRead(...a),
  deleteNotificationForUser: (...a: unknown[]) => deleteNotificationForUser(...a),
  bulkDeleteNotificationsForUser: (...a: unknown[]) => bulkDeleteNotificationsForUser(...a),
  deleteAllNotificationsForUser: (...a: unknown[]) => deleteAllNotificationsForUser(...a),
}));

import type { AuthRequest } from '../../../middleware/auth.middleware';
import { NotificationsController } from '../../../controllers/notifications.controller';

describe('NotificationsController', () => {
  let ctrl: NotificationsController;

  beforeEach(() => {
    jest.clearAllMocks();
    ctrl = new NotificationsController();
  });

  function authReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
    return { user: { id: 7, email: 'n@test', role: 'nurse' as const }, ...overrides } as AuthRequest;
  }

  it('getNotifications devuelve lista de persistencia', async () => {
    listActiveNotificationsForUser.mockResolvedValueOnce([{ id: 1, type: 'x' }]);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.getNotifications(authReq(), res, jest.fn());
    expect(listActiveNotificationsForUser).toHaveBeenCalledWith(7);
    expect(json).toHaveBeenCalledWith([{ id: 1, type: 'x' }]);
  });

  it('markAsRead llama persistencia', async () => {
    markNotificationRead.mockResolvedValueOnce(true);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.markAsRead({ ...authReq(), params: { id: '12' } } as unknown as AuthRequest, res, jest.fn());
    expect(markNotificationRead).toHaveBeenCalledWith(7, 12);
    expect(json).toHaveBeenCalledWith({ message: 'Notificación marcada como leída' });
  });

  it('acknowledge llama persistencia', async () => {
    markNotificationAcknowledged.mockResolvedValueOnce(true);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.acknowledge({ ...authReq(), params: { id: '3' } } as unknown as AuthRequest, res, jest.fn());
    expect(markNotificationAcknowledged).toHaveBeenCalledWith(7, 3);
    expect(json).toHaveBeenCalledWith({ message: 'Notificación reconocida' });
  });

  it('markAllAsRead devuelve affected', async () => {
    markAllNotificationsRead.mockResolvedValueOnce(4);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.markAllAsRead(authReq(), res, jest.fn());
    expect(json).toHaveBeenCalledWith({
      message: 'Todas las notificaciones marcadas como leídas',
      affected: 4,
    });
  });

  it('delete llama persistencia', async () => {
    deleteNotificationForUser.mockResolvedValueOnce(true);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.delete({ ...authReq(), params: { id: '99' } } as unknown as AuthRequest, res, jest.fn());
    expect(deleteNotificationForUser).toHaveBeenCalledWith(7, 99);
    expect(json).toHaveBeenCalledWith({ message: 'Notificación eliminada' });
  });

  it('bulkDelete con ids elimina seleccionadas', async () => {
    bulkDeleteNotificationsForUser.mockResolvedValueOnce(2);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.bulkDelete(
      { ...authReq(), body: { ids: [1, 2] } } as unknown as AuthRequest,
      res,
      jest.fn(),
    );
    expect(bulkDeleteNotificationsForUser).toHaveBeenCalledWith(7, [1, 2]);
    expect(json).toHaveBeenCalledWith({ message: 'Notificaciones eliminadas', affected: 2 });
  });

  it('bulkDelete con all elimina todas', async () => {
    deleteAllNotificationsForUser.mockResolvedValueOnce(5);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.bulkDelete(
      { ...authReq(), body: { all: true } } as unknown as AuthRequest,
      res,
      jest.fn(),
    );
    expect(deleteAllNotificationsForUser).toHaveBeenCalledWith(7);
    expect(json).toHaveBeenCalledWith({ message: 'Notificaciones eliminadas', affected: 5 });
  });
});
