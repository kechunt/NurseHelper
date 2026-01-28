import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddPatientAssignedToIdColumn1734100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar si la columna ya existe antes de agregarla
    const table = await queryRunner.getTable('patients');
    if (!table) {
      throw new Error('La tabla patients no existe');
    }
    
    const hasAssignedToIdColumn = table.findColumnByName('assignedToId');

    if (!hasAssignedToIdColumn) {
      console.log('🔄 Agregando columna assignedToId a la tabla patients...');
      
      // Agregar la columna assignedToId
      await queryRunner.addColumn(
        'patients',
        new TableColumn({
          name: 'assignedToId',
          type: 'int',
          isNullable: true,
        })
      );
      
      // Crear la foreign key si la tabla users existe
      const usersTable = await queryRunner.getTable('users');
      if (usersTable) {
        console.log('🔄 Creando foreign key para assignedToId...');
        await queryRunner.createForeignKey(
          'patients',
          new TableForeignKey({
            columnNames: ['assignedToId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          })
        );
      }

      // Crear índice para mejorar el rendimiento
      console.log('🔄 Creando índice para assignedToId...');
      await queryRunner.createIndex(
        'patients',
        new TableIndex({
          name: 'IDX_PATIENT_ASSIGNED_TO',
          columnNames: ['assignedToId'],
        })
      );
      
      console.log('✅ Columna assignedToId agregada exitosamente');
    } else {
      console.log('ℹ️ La columna assignedToId ya existe en la tabla patients');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patients');
    if (!table) {
      console.log('ℹ️ La tabla patients no existe');
      return;
    }
    
    const hasAssignedToIdColumn = table.findColumnByName('assignedToId');

    if (hasAssignedToIdColumn) {
      // Eliminar índice primero
      const index = table.indices.find(idx => idx.columnNames.includes('assignedToId'));
      if (index) {
        console.log(`🔄 Eliminando índice ${index.name}...`);
        await queryRunner.dropIndex('patients', index);
      }

      // Eliminar foreign key primero
      const foreignKeys = table.foreignKeys.filter(fk => fk.columnNames.includes('assignedToId'));
      for (const fk of foreignKeys) {
        console.log(`🔄 Eliminando foreign key ${fk.name}...`);
        await queryRunner.dropForeignKey('patients', fk);
      }
      
      console.log('🔄 Eliminando columna assignedToId de la tabla patients...');
      await queryRunner.dropColumn('patients', 'assignedToId');
      console.log('✅ Columna assignedToId eliminada exitosamente');
    }
  }
}
