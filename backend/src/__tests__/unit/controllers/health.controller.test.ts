import type { Request, Response } from 'express';

jest.mock('os', () => {
  const actual = jest.requireActual<typeof import('os')>('os');
  return {
    __esModule: true,
    release: actual.release,
    default: Object.assign({}, actual, {
      totalmem: () => 1_000_000,
      freemem: () => 600_000,
      release: actual.release,
    }),
  };
});

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    isInitialized: true,
    query: jest.fn().mockResolvedValue(undefined),
    options: { pool: { total: 2 } },
  },
}));

import { AppDataSource } from '../../../data-source';
import { HealthController } from '../../../controllers/health.controller';

describe('HealthController', () => {
  let ctrl: HealthController;

  beforeEach(() => {
    jest.clearAllMocks();
    ctrl = new HealthController();
  });

  async function flushMetrics(): Promise<void> {
    await new Promise<void>((r) => setImmediate(r));
  }

  it('basic responde healthy cuando SELECT 1 funciona', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    const next = jest.fn();
    ctrl.basic({} as Request, res, next);
    await flushMetrics();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'healthy', timestamp: expect.any(String) })
    );
  });

  it('basic responde unhealthy si la query falla', async () => {
    (AppDataSource.query as jest.Mock).mockRejectedValueOnce(new Error('down'));
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    ctrl.basic({} as Request, res, jest.fn());
    await flushMetrics();
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unhealthy', error: 'Database connection failed' })
    );
    (AppDataSource.query as jest.Mock).mockResolvedValue(undefined);
  });

  it('metrics incluye totales, errorRate y consultas lentas', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    ctrl.incrementRequest();
    ctrl.incrementRequest();
    ctrl.incrementError();
    ctrl.incrementQuery(false);
    ctrl.incrementQuery(true);
    ctrl.metrics({} as Request, res, jest.fn());
    await flushMetrics();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        application: expect.objectContaining({
          requests: expect.objectContaining({
            total: 2,
            errors: 1,
            errorRate: 50,
          }),
          database: expect.objectContaining({
            queries: 2,
            slowQueries: 1,
            connections: 2,
          }),
        }),
        system: expect.objectContaining({
          memory: expect.objectContaining({
            used: 400_000,
            total: 1_000_000,
            free: 600_000,
            percentage: 40,
          }),
        }),
      })
    );
  });

  it('ready responde cuando la BD responde', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    ctrl.ready({} as Request, res, jest.fn());
    await flushMetrics();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ready', timestamp: expect.any(String) })
    );
  });

  it('ready responde 503 si la BD falla', async () => {
    (AppDataSource.query as jest.Mock).mockRejectedValueOnce(new Error('no db'));
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    ctrl.ready({} as Request, res, jest.fn());
    await flushMetrics();
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'not ready', error: 'Database not ready' })
    );
    (AppDataSource.query as jest.Mock).mockResolvedValue(undefined);
  });

  it('live responde alive sin consultar BD', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    ctrl.live({} as Request, res, jest.fn());
    await flushMetrics();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'alive', timestamp: expect.any(String) })
    );
    expect(AppDataSource.query).not.toHaveBeenCalled();
  });

  it('detailed responde 200 con checks database/memory/disk en estado healthy', async () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    ctrl.detailed({} as Request, res, jest.fn());
    await flushMetrics();
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'healthy',
        checks: expect.objectContaining({
          database: expect.objectContaining({ status: 'healthy', responseTime: expect.any(Number) }),
          memory: expect.objectContaining({
            status: expect.any(String),
            total: expect.any(Number),
            percentage: expect.any(Number),
          }),
          disk: expect.objectContaining({ status: 'healthy' }),
        }),
      })
    );
  });

  it('detailed marca unhealthy y 503 si la BD falla', async () => {
    (AppDataSource.query as jest.Mock).mockRejectedValueOnce(new Error('db caída'));
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    ctrl.detailed({} as Request, res, jest.fn());
    await flushMetrics();
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'unhealthy',
        checks: expect.objectContaining({
          database: expect.objectContaining({ status: 'unhealthy', message: 'db caída' }),
        }),
      })
    );
    (AppDataSource.query as jest.Mock).mockResolvedValue(undefined);
  });

  it('detailed degrada el check de BD si responseTime > 1000ms', async () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(1_000_000).mockReturnValueOnce(1_001_600);
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    ctrl.detailed({} as Request, res, jest.fn());
    await flushMetrics();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'degraded',
        checks: expect.objectContaining({
          database: expect.objectContaining({ status: 'degraded', responseTime: 1600 }),
        }),
      })
    );
    expect(status).toHaveBeenCalledWith(200);
    jest.restoreAllMocks();
  });
});
