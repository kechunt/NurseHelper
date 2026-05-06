import type { Response } from 'express';
import { logApiError } from '../../../utils/logger';
import {
  handleControllerError,
  parseId,
  parsePagination,
  sendErrorResponse,
  sendPaginatedResponse,
} from '../../../utils/response.helper';

jest.mock('../../../utils/logger', () => ({
  logApiError: jest.fn(),
}));

describe('response.helper', () => {
  describe('parseId', () => {
    it('parsea entero válido y rechaza vacío o NaN', () => {
      expect(parseId(undefined)).toBeNull();
      expect(parseId('')).toBeNull();
      expect(parseId('42')).toBe(42);
      expect(parseId('abc')).toBeNull();
    });
  });

  describe('parsePagination', () => {
    it('aplica por defecto page 1 y limit 50', () => {
      expect(parsePagination({})).toEqual({ page: 1, limit: 50, skip: 0 });
    });

    it('respeta page y limit numéricos y calcula skip', () => {
      expect(parsePagination({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10, skip: 20 });
    });

    it('acota page mínimo 1 y limit entre 1 y 1000', () => {
      expect(parsePagination({ page: '0', limit: '5' })).toEqual({ page: 1, limit: 5, skip: 0 });
      expect(parsePagination({ page: '1', limit: '5000' })).toEqual({ page: 1, limit: 1000, skip: 0 });
    });
  });

  describe('sendPaginatedResponse', () => {
    it('envía JSON con totalPages redondeado hacia arriba', () => {
      const json = jest.fn();
      const res = { json } as unknown as Response;
      sendPaginatedResponse(res, [{ a: 1 }], 100, 2, 25);
      expect(json).toHaveBeenCalledWith({
        items: [{ a: 1 }],
        total: 100,
        page: 2,
        limit: 25,
        totalPages: 4,
      });
    });
  });

  describe('sendErrorResponse', () => {
    it('envía status y cuerpo con mensaje y código opcional', () => {
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status } as unknown as Response;
      sendErrorResponse(res, 400, 'Petición inválida', 'BAD_REQUEST');
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ message: 'Petición inválida', code: 'BAD_REQUEST' });
    });
  });

  describe('handleControllerError', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('propaga status y mensaje del error cuando error.status está definido', () => {
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status } as unknown as Response;
      const req = { method: 'GET', originalUrl: '/x', body: {} };
      handleControllerError(
        { status: 404, message: 'No encontrado', code: 'NOT_FOUND' },
        req,
        res,
        'Por defecto'
      );
      expect(logApiError).toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith({ message: 'No encontrado', code: 'NOT_FOUND' });
    });

    it('usa defaultMessage si hay status pero no mensaje en el error', () => {
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status } as unknown as Response;
      handleControllerError({ status: 400 }, {}, res, 'Mensaje por defecto');
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ message: 'Mensaje por defecto' });
    });

    it('responde 500 SERVER_ERROR si no hay error.status', () => {
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status } as unknown as Response;
      handleControllerError(new Error('fallo interno'), {}, res, 'Algo salió mal');
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Algo salió mal', code: 'SERVER_ERROR' });
    });
  });
});
