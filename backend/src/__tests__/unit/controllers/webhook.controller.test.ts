import type { Response } from 'express';

jest.mock('../../../services/webhook.service', () => ({
  webhookService: {
    register: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
    test: jest.fn(),
  },
}));

import type { AuthRequest } from '../../../middleware/auth.middleware';
import { webhookService } from '../../../services/webhook.service';
import { WebhookController } from '../../../controllers/webhook.controller';

describe('WebhookController', () => {
  let ctrl: WebhookController;

  beforeEach(() => {
    jest.clearAllMocks();
    ctrl = new WebhookController();
    (webhookService.register as jest.Mock).mockResolvedValue({
      id: 10,
      url: 'https://hook.example/x',
      events: ['a', 'b'],
      active: true,
      userId: 3,
      createdAt: new Date('2026-01-02'),
    });
    (webhookService.list as jest.Mock).mockResolvedValue([]);
    (webhookService.delete as jest.Mock).mockResolvedValue(undefined);
    (webhookService.test as jest.Mock).mockResolvedValue({ success: true, message: 'probado' });
  });

  function authReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
    return { user: { id: 3, email: 'u@test', role: 'admin' as const }, ...overrides } as AuthRequest;
  }

  function mockRes(): { json: jest.Mock; status: jest.Mock; res: Response } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status, res: { status, json } as unknown as Response };
  }

  it('register responde 400 si falta url', async () => {
    const { json, status, res } = mockRes();
    await ctrl.register({ ...authReq(), body: { events: [] } } as AuthRequest, res, jest.fn());
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'VALIDATION_ERROR', message: expect.stringContaining('url') })
    );
    expect(webhookService.register).not.toHaveBeenCalled();
  });

  it('register responde 400 si falta events', async () => {
    const { json, status, res } = mockRes();
    await ctrl.register({ ...authReq(), body: { url: 'https://x' } } as AuthRequest, res, jest.fn());
    expect(status).toHaveBeenCalledWith(400);
    expect(webhookService.register).not.toHaveBeenCalled();
  });

  it('register responde 400 si events no es array', async () => {
    const { json, status, res } = mockRes();
    await ctrl.register(
      { ...authReq(), body: { url: 'https://x', events: 'not-array' } } as AuthRequest,
      res,
      jest.fn()
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(webhookService.register).not.toHaveBeenCalled();
  });

  it('register llama al servicio y responde 201 con subset del webhook', async () => {
    const { json, status, res } = mockRes();
    await ctrl.register(
      {
        ...authReq(),
        body: { url: 'https://api.example/h', events: ['e1'], secret: 'sec' },
      } as AuthRequest,
      res,
      jest.fn()
    );
    expect(webhookService.register).toHaveBeenCalledWith({
      url: 'https://api.example/h',
      events: ['e1'],
      secret: 'sec',
      userId: 3,
    });
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      message: 'Webhook registrado exitosamente',
      webhook: {
        id: 10,
        url: 'https://hook.example/x',
        events: ['a', 'b'],
        active: true,
      },
    });
  });

  it('list delega en webhookService.list y devuelve webhooks', async () => {
    const items = [{ id: 1, url: 'u', events: ['x'], active: true, userId: 3, createdAt: new Date() }];
    (webhookService.list as jest.Mock).mockResolvedValueOnce(items);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.list(authReq(), res, jest.fn());
    expect(webhookService.list).toHaveBeenCalledWith(3);
    expect(json).toHaveBeenCalledWith({ webhooks: items });
  });

  it('delete delega en webhookService.delete con id parseado', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.delete({ ...authReq(), params: { id: '42' } } as AuthRequest, res, jest.fn());
    expect(webhookService.delete).toHaveBeenCalledWith(42, 3);
    expect(json).toHaveBeenCalledWith({ message: 'Webhook eliminado exitosamente' });
  });

  it('test delega en webhookService.test y devuelve result', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.test({ ...authReq(), params: { id: '5' } } as AuthRequest, res, jest.fn());
    expect(webhookService.test).toHaveBeenCalledWith(5, 3);
    expect(json).toHaveBeenCalledWith({ message: 'Webhook probado', result: { success: true, message: 'probado' } });
  });
});
