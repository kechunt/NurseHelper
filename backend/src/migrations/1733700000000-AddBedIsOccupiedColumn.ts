import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBedIsOccupiedColumn1733700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar si la columna ya existe antes de agregarla
    const table = await queryRunner.getTable('beds');
    const hasIsOccupiedColumn = table?.findColumnByName('isOccupied');

    if (!hasIsOccupiedColumn) {
      console.log('🔄 Agregando columna isOccupied a la tabla beds...');
      await queryRunner.addColumn(
        'beds',
        new TableColumn({
          name: 'isOccupied',
          type: 'boolean',
          default: false,
          isNullable: false,
        })
      );
      console.log('✅ Columna isOccupied agregada exitosamente');
    } else {
      console.log('ℹ️ La columna isOccupied ya existe en la tabla beds');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('beds');
    const hasIsOccupiedColumn = table?.findColumnByName('isOccupied');

    if (hasIsOccupiedColumn) {
      console.log('🔄 Eliminando columna isOccupied de la tabla beds...');
      await queryRunner.dropColumn('beds', 'isOccupied');
      console.log('✅ Columna isOccupied eliminada exitosamente');
    }
  }
}
