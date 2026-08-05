import {
  AppError,
  ErrorCode,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from '../../../utils/errors';

describe('errors', () => {
  it('AppError guarda statusCode, code, isOperational y details', () => {
    const e = new AppError('msg', 418, ErrorCode.SERVER_ERROR, false, { x: 1 });
    expect(e.message).toBe('msg');
    expect(e.statusCode).toBe(418);
    expect(e.code).toBe(ErrorCode.SERVER_ERROR);
    expect(e.isOperational).toBe(false);
    expect(e.details).toEqual({ x: 1 });
  });

  it('ValidationError es 400 VALIDATION_ERROR', () => {
    const e = new ValidationError('bad', { field: 'id' });
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(e.details).toEqual({ field: 'id' });
  });

  it('NotFoundError incluye recurso e id opcional', () => {
    expect(new NotFoundError('Paciente').message).toBe('Paciente no encontrado');
    expect(new NotFoundError('Cama', 3).message).toBe('Cama con ID 3 no encontrado');
    expect(new NotFoundError('X').statusCode).toBe(404);
    expect(new NotFoundError('X').code).toBe(ErrorCode.NOT_FOUND);
  });

  it('ForbiddenError usa código y mensaje por defecto', () => {
    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new ForbiddenError('x').message).toBe('x');
  });

  it('TooManyRequestsError es 429', () => {
    expect(new TooManyRequestsError().statusCode).toBe(429);
    expect(new TooManyRequestsError().code).toBe(ErrorCode.TOO_MANY_REQUESTS);
  });
});
