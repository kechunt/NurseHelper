import type { NextFunction, Request, Response } from 'express';
import {
  authRateLimitMiddleware,
  rateLimitMiddleware,
} from '../../../middleware/rate-limit.middleware';
import { logger } from '../../../utils/logger';

jest.mock('../../../utils/logger', () => ({
  logger: { warn: jest.fn() },
}));

function remoteReq(): Request {
  return {
    ip: '203.0.113.9',
    socket: {},
    headers: {},
    path: '/api/x',
  } as unknown as Request;
}

describe('rateLimitMiddleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('tras exceder maxRequests solo registra telemetría y permite continuar', () => {
    const mw = rateLimitMiddleware(60_000, 2);
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;
    const req = remoteReq();

    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '2');

    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);

    expect(() => mw(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalledTimes(3);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Observed', 'true');
    expect(logger.warn).toHaveBeenCalledWith(
      'Rate limit exceeded',
      expect.objectContaining({ ip: req.ip, path: req.path })
    );
  });

  it('en desarrollo desde localhost omite límite y no escribe headers', () => {
    process.env.NODE_ENV = 'development';
    const mw = rateLimitMiddleware(60_000, 1);
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;
    const req = {
      ip: '127.0.0.1',
      socket: {},
      headers: { host: 'localhost:3000' },
      path: '/',
    } as unknown as Request;

    mw(req, res, next);
    mw(req, res, next);
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(3);
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});

describe('authRateLimitMiddleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('en development usa límite 200 para IP no local', () => {
    process.env.NODE_ENV = 'development';
    const mw = authRateLimitMiddleware();
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;
    mw(remoteReq(), res, next);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '200');
  });

  it('en production usa límite 5', () => {
    process.env.NODE_ENV = 'production';
    const mw = authRateLimitMiddleware();
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;
    mw(remoteReq(), res, next);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
  });
});
