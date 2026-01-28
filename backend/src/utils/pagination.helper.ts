/**
 * Utilidades para paginación avanzada
 * Incluye paginación basada en cursor para grandes volúmenes
 */

import { SelectQueryBuilder } from 'typeorm';
import { CursorPaginationDto, CursorResponse } from '../dto/common.dto';

/**
 * Paginación basada en cursor
 * Útil para grandes volúmenes de datos donde la paginación tradicional es ineficiente
 */
export class CursorPaginationHelper {
  /**
   * Aplicar paginación con cursor a un query builder
   */
  static async paginateWithCursor<T>(
    queryBuilder: SelectQueryBuilder<T>,
    cursorDto: CursorPaginationDto,
    cursorField: string = 'id',
    order: 'ASC' | 'DESC' = 'ASC'
  ): Promise<CursorResponse<T>> {
    const limit = Math.min(cursorDto.limit || 50, 1000);

    // Si hay cursor, aplicar filtro
    if (cursorDto.cursor) {
      const cursorValue = this.decodeCursor(cursorDto.cursor);
      if (order === 'ASC') {
        queryBuilder.andWhere(`${queryBuilder.alias}.${cursorField} > :cursor`, { cursor: cursorValue });
      } else {
        queryBuilder.andWhere(`${queryBuilder.alias}.${cursorField} < :cursor`, { cursor: cursorValue });
      }
    }

    // Aplicar orden y límite
    queryBuilder.orderBy(`${queryBuilder.alias}.${cursorField}`, order);
    queryBuilder.take(limit + 1); // Tomar uno más para verificar si hay más

    const items = await queryBuilder.getMany();

    // Verificar si hay más resultados
    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;

    // Generar cursor para el siguiente resultado
    let nextCursor: string | undefined;
    if (hasMore && resultItems.length > 0) {
      const lastItem = resultItems[resultItems.length - 1];
      const cursorValue = (lastItem as any)[cursorField];
      nextCursor = this.encodeCursor(cursorValue);
    }

    return {
      items: resultItems,
      nextCursor,
      hasMore
    };
  }

  /**
   * Codificar cursor (base64 simple)
   */
  private static encodeCursor(value: any): string {
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  /**
   * Decodificar cursor
   */
  private static decodeCursor(cursor: string): any {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch (error) {
      throw new Error('Cursor inválido');
    }
  }
}

/**
 * Helper para paginación tradicional mejorada
 */
export class PaginationHelper {
  /**
   * Aplicar paginación a un query builder
   */
  static applyPagination<T>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number = 1,
    limit: number = 50
  ): SelectQueryBuilder<T> {
    const skip = (page - 1) * limit;
    return queryBuilder.skip(skip).take(limit);
  }

  /**
   * Calcular información de paginación
   */
  static calculatePaginationInfo(total: number, page: number, limit: number) {
    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1
    };
  }
}
