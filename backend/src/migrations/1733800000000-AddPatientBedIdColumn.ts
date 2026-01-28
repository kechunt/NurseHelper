import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddPatientBedIdColumn1733800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar si la columna ya existe antes de agregarla
    const table = await queryRunner.getTable('patients');
    if (!table) {
      throw new Error('La tabla patients no existe');
    }
    
    const hasBedIdColumn = table.findColumnByName('bedId');

    if (!hasBedIdColumn) {
      console.log('🔄 Agregando columna bedId a la tabla patients...');
      
      // Agregar la columna bedId
      await queryRunner.addColumn(
        'patients',
        new TableColumn({
          name: 'bedId',
          type: 'int',
          isNullable: true,
        })
      );
      
      // Crear la foreign key si la tabla beds existe
      const bedsTable = await queryRunner.getTable('beds');
      if (bedsTable) {
        console.log('🔄 Creando foreign key para bedId...');
        await queryRunner.createForeignKey(
          'patients',
          new TableForeignKey({
            columnNames: ['bedId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'beds',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          })
        );
      }
      
      console.log('✅ Columna bedId agregada exitosamente');
    } else {
      console.log('ℹ️ La columna bedId ya existe en la tabla patients');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patients');
    if (!table) {
      console.log('ℹ️ La tabla patients no existe');
      return;
    }
    
    const hasBedIdColumn = table.findColumnByName('bedId');

    if (hasBedIdColumn) {
      // Eliminar foreign key primero
      const foreignKeys = table.foreignKeys.filter(fk => fk.columnNames.includes('bedId'));
      for (const fk of foreignKeys) {
        console.log(`🔄 Eliminando foreign key ${fk.name}...`);
        await queryRunner.dropForeignKey('patients', fk);
      }
      
      console.log('🔄 Eliminando columna bedId de la tabla patients...');
      await queryRunner.dropColumn('patients', 'bedId');
      console.log('✅ Columna bedId eliminada exitosamente');
    }
  }
}
