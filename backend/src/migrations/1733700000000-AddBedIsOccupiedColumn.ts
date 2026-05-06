import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { logger } from '../utils/logger';

export class AddBedIsOccupiedColumn1733700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar si la columna ya existe antes de agregarla
    const table = await queryRunner.getTable('beds');
    const hasIsOccupiedColumn = table?.findColumnByName('isOccupied');

    if (!hasIsOccupiedColumn) {
      logger.info('🔄 Agregando columna isOccupied a la tabla beds...');
      await queryRunner.addColumn(
        'beds',
        new TableColumn({
          name: 'isOccupied',
          type: 'boolean',
          default: false,
          isNullable: false,
        })
      );
      logger.info('✅ Columna isOccupied agregada exitosamente');
    } else {
      logger.info('ℹ️ La columna isOccupied ya existe en la tabla beds');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('beds');
    const hasIsOccupiedColumn = table?.findColumnByName('isOccupied');

    if (hasIsOccupiedColumn) {
      logger.info('🔄 Eliminando columna isOccupied de la tabla beds...');
      await queryRunner.dropColumn('beds', 'isOccupied');
      logger.info('✅ Columna isOccupied eliminada exitosamente');
    }
  }
}
