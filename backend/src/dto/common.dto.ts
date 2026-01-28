/**
 * DTOs comunes y utilidades de validación
 */

import { IsOptional, IsInt, Min, Max, IsString, Length, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para paginación
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;
}

/**
 * DTO para cursor-based pagination
 */
export class CursorPaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  cursor?: string;
}

/**
 * Respuesta paginada estándar
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Respuesta con cursor
 */
export interface CursorResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}
