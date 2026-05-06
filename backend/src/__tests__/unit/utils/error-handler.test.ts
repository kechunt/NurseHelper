import type { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../../../utils/errors';
import { asyncHandler, errorHandler, sendError } from '../../../utils/error-handler';
import { logger, logApiError } from '../../../utils/logger';

jest.mock('../../../utils/logger', () => ({
  logApiError: jest.fn(),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('error-handler', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  function mockRes(): { res: Response; json: jest.Mock; status: jest.Mock } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;
    return { res, json, status };
  }

  describe('errorHandler', () => {
    it('responde con AppError y registra error operacional', () => {
      process.env.NODE_ENV = 'development';
      const { res, json, status } = mockRes();
      const req = { originalUrl: '/api/x' } as Request;
      const next = jest.fn() as NextFunction;
      const err = new ValidationError('inválido', { f: 1 });

      errorHandler(err, req, res, next);

      expect(logApiError).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'inválido',
          statusCode: 400,
          path: '/api/x',
          details: { f: 1 },
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('error genérico en producción oculta el mensaje', () => {
      process.env.NODE_ENV = 'production';
      const { res, json, status } = mockRes();
      const req = { originalUrl: '/y' } as Request;
      errorHandler(new Error('secreto'), req, res, jest.fn() as NextFunction);

      expect(logger.error).toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error interno del servidor',
          statusCode: 500,
        })
      );
    });

    it('error genérico en desarrollo incluye mensaje y stack en details', () => {
      process.env.NODE_ENV = 'development';
      const { res, json } = mockRes();
      const e = new Error('visible');
      errorHandler(e, { originalUrl: '/z' } as Request, res, jest.fn() as NextFunction);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'visible',
          details: expect.objectContaining({ stack: expect.any(String) }),
        })
      );
    });
  });

  describe('asyncHandler', () => {
    it('reenvía el rechazo de la promesa a next', async () => {
      const next = jest.fn();
      const fn = jest.fn().mockRejectedValue(new Error('async boom'));
      asyncHandler(fn as any)({} as Request, {} as Response, next as NextFunction);
      await new Promise<void>((r) => setImmediate(r));
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'async boom' }));
    });
  });

  describe('sendError', () => {
    it('envía AppError con status y código', () => {
      const { res, json, status } = mockRes();
      const req = { originalUrl: '/r' } as Request;
      sendError(res, new ValidationError('bad'), req);
      expect(logApiError).toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'bad', statusCode: 400, path: '/r' })
      );
    });

    it('Error genérico responde 500 genérico', () => {
      const { res, json, status } = mockRes();
      sendError(res, new Error('interno'), {} as Request);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error interno del servidor', statusCode: 500 })
      );
    });
  });
});
