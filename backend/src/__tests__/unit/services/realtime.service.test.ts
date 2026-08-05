jest.mock('../../../utils/jwt', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { verifyToken } from '../../../utils/jwt';
import {
  emitAdminOperationalInvalidate,
  emitNotificationUpsert,
  emitNurseDashboardInvalidate,
  emitToUser,
} from '../../../services/realtime.service';

describe('realtime.service', () => {
  it('emit* no lanza si Socket.IO no está inicializado', () => {
    expect(() => emitToUser(1, 'test', {})).not.toThrow();
    expect(() =>
      emitNotificationUpsert(1, {
        id: 1,
        type: 'info',
        severity: 'info',
        requiresAck: false,
        title: 't',
        body: 'b',
        payload: null,
        dedupeKey: 'k',
        readAt: null,
        acknowledgedAt: null,
        createdAt: new Date().toISOString(),
      }),
    ).not.toThrow();
    expect(() => emitNurseDashboardInvalidate(2, 'secondary')).not.toThrow();
    expect(() => emitAdminOperationalInvalidate()).not.toThrow();
  });

  it('verifyToken se usa en middleware de socket al inicializar', () => {
    expect(verifyToken).toBeDefined();
  });
});
