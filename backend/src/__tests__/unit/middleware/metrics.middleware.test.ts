import type { NextFunction, Request, Response } from 'express';
import { healthController } from '../../../controllers/health.controller';
import { metricsMiddleware } from '../../../middleware/metrics.middleware';
import { logger } from '../../../utils/logger';

jest.mock('../../../controllers/health.controller', () => ({
  healthController: {
    incrementRequest: jest.fn(),
    incrementError: jest.fn(),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { warn: jest.fn() },
}));

describe('metricsMiddleware', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createRes(statusCode: number): Response {
    const finishCbs: (() => void)[] = [];
    const res = {
      statusCode,
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') {
          finishCbs.push(cb);
        }
        return res;
      }),
      emitFinish: () => finishCbs.forEach((cb) => cb()),
    };
    return res as unknown as Response;
  }

  it('incrementa requests y llama next', () => {
    const res = createRes(200);
    metricsMiddleware({ path: '/x', method: 'GET' } as Request, res, next);
    expect(healthController.incrementRequest).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalled();
    (res as any).emitFinish();
    expect(healthController.incrementError).not.toHaveBeenCalled();
  });

  it('en finish con status >= 400 incrementa errores', () => {
    const res = createRes(404);
    metricsMiddleware({ path: '/api/x', method: 'GET' } as Request, res, next);
    (res as any).emitFinish();
    expect(healthController.incrementError).toHaveBeenCalledTimes(1);
  });

  it('registra slow request si tarda >1s y path incluye /api/', () => {
    const t0 = 1_000_000;
    jest.spyOn(Date, 'now').mockReturnValueOnce(t0).mockReturnValueOnce(t0 + 1500);
    const res = createRes(200);
    metricsMiddleware({ path: '/api/patients', method: 'GET' } as Request, res, next);
    (res as any).emitFinish();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Slow request'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('/api/patients'));
    (Date.now as jest.Mock).mockRestore();
  });
});
