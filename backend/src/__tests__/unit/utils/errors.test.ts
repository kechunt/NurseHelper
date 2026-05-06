import {
  AppError,
  BusinessRuleError,
  ConflictError,
  ErrorCode,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
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

  it('UnauthorizedError y ForbiddenError usan códigos y mensajes por defecto', () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new UnauthorizedError('x').message).toBe('x');
  });

  it('ConflictError permite código distinto', () => {
    const e = new ConflictError('dup', ErrorCode.USERNAME_EXISTS);
    expect(e.statusCode).toBe(409);
    expect(e.code).toBe(ErrorCode.USERNAME_EXISTS);
  });

  it('BusinessRuleError es 422', () => {
    const e = new BusinessRuleError('regla', { a: 1 });
    expect(e.statusCode).toBe(422);
    expect(e.code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
    expect(e.details).toEqual({ a: 1 });
  });

  it('TooManyRequestsError es 429', () => {
    expect(new TooManyRequestsError().statusCode).toBe(429);
    expect(new TooManyRequestsError().code).toBe(ErrorCode.TOO_MANY_REQUESTS);
  });
});
