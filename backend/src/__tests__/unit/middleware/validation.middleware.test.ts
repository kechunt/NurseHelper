import type { NextFunction, Request, Response } from 'express';
import { IsString, MinLength } from 'class-validator';
import { validateDto } from '../../../middleware/validation.middleware';
import { ValidationError } from '../../../utils/errors';

class TitleDto {
  @IsString()
  @MinLength(3, { message: 'muy corto' })
  title!: string;
}

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
});
