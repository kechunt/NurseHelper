import type { NextFunction, Request, Response } from 'express';
import { IsString, MinLength } from 'class-validator';
import { PaginationDto } from '../../../dto/common.dto';
import { paginatedResponse, paginationMiddleware } from '../../../middleware/pagination.middleware';
import { validateDto, validateQuery } from '../../../middleware/validation.middleware';
import { ValidationError } from '../../../utils/errors';

class TitleDto {
  @IsString()
  @MinLength(3, { message: 'muy corto' })
  title!: string;
}

describe('paginationMiddleware', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rellena req.pagination con valores por defecto y orden DESC', () => {
    const req = { query: {} } as Request;
    paginationMiddleware()(req, {} as Response, next);
    expect(req.pagination).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
      search: undefined,
    });
    expect(next).toHaveBeenCalled();
  });

  it('respeta page, limit acotado, sort ASC y search', () => {
    const req = {
      query: {
        page: '2',
        limit: '500',
        sortBy: 'name',
        sortOrder: 'asc',
        search: 'x',
      },
    } as unknown as Request;
    paginationMiddleware(10, 50)(req, {} as Response, next);
    expect(req.pagination).toMatchObject({
      page: 2,
      limit: 50,
      skip: 50,
      sortBy: 'name',
      sortOrder: 'ASC',
      search: 'x',
    });
  });
});

describe('paginatedResponse', () => {
  it('calcula totalPages y flags', () => {
    expect(paginatedResponse([1, 2], 25, 2, 10)).toEqual({
      items: [1, 2],
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
  });
});

describe('validation.middleware', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validateDto llama next y sustituye body por instancia válida', async () => {
    const req = { body: { title: 'abc' } } as Request;
    await validateDto(TitleDto)(req, {} as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toBeInstanceOf(TitleDto);
    expect((req.body as TitleDto).title).toBe('abc');
  });

  it('validateDto pasa error a next si falla class-validator', async () => {
    const req = { body: { title: 'ab' } } as Request;
    await validateDto(TitleDto)(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });

  it('validateQuery valida query y asigna dto', async () => {
    const req = { query: { page: '2', limit: '25' } } as unknown as Request;
    await validateQuery(PaginationDto)(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.query).toMatchObject({ page: 2, limit: 25 });
  });

  it('validateQuery rechaza valores inválidos', async () => {
    const req = { query: { page: '-1' } } as unknown as Request;
    await validateQuery(PaginationDto)(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });
});
