import type { Response } from 'express';

jest.mock('../../../services/notification.service', () => ({
  notificationService: {},
}));

import type { AuthRequest } from '../../../middleware/auth.middleware';
import { NotificationsController } from '../../../controllers/notifications.controller';

describe('NotificationsController', () => {
  let ctrl: NotificationsController;

  beforeEach(() => {
    ctrl = new NotificationsController();
  });

  function authReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
    return { user: { id: 7, email: 'n@test', role: 'nurse' as const }, ...overrides } as AuthRequest;
  }

  it('getNotifications responde array vacío', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.getNotifications(authReq(), res, jest.fn());
    expect(json).toHaveBeenCalledWith([]);
  });

  it('markAsRead responde mensaje', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.markAsRead({ ...authReq(), params: { id: '12' } } as AuthRequest, res, jest.fn());
    expect(json).toHaveBeenCalledWith({ message: 'Notificación marcada como leída' });
  });

  it('markAllAsRead responde mensaje', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.markAllAsRead(authReq(), res, jest.fn());
    expect(json).toHaveBeenCalledWith({ message: 'Todas las notificaciones marcadas como leídas' });
  });

  it('delete responde mensaje', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.delete({ ...authReq(), params: { id: '99' } } as AuthRequest, res, jest.fn());
    expect(json).toHaveBeenCalledWith({ message: 'Notificación eliminada' });
  });
});
