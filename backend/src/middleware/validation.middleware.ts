/**
 * Middleware de validación usando class-validator
 */

import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidationError as AppValidationError } from '../utils/errors';

/**
 * Valida un DTO contra los datos del request
 */
export function validateDto<T extends object>(dtoClass: new () => T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Convertir el body a instancia del DTO
      const dto = plainToInstance(dtoClass, req.body, {
        enableImplicitConversion: true,
      });

      const errors = await validate(dto as object, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (errors.length > 0) {
        const formattedErrors = formatValidationErrors(errors);
        throw new AppValidationError('Error de validación', formattedErrors);
      }

      // Reemplazar req.body con el DTO validado
      req.body = dto;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Formatea errores de validación para respuesta
 */
function formatValidationErrors(errors: ValidationError[]): any {
  return errors.map(error => ({
    property: error.property,
    value: error.value,
    constraints: error.constraints,
    children: error.children && error.children.length > 0 
      ? formatValidationErrors(error.children) 
      : undefined,
  }));
}
