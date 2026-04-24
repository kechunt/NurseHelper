import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddPatientAreaIdColumn1773000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patients');
    if (!table) {
      throw new Error('La tabla patients no existe');
    }

    const hasAreaIdColumn = table.findColumnByName('areaId');
    if (!hasAreaIdColumn) {
      await queryRunner.addColumn(
        'patients',
        new TableColumn({
          name: 'areaId',
          type: 'int',
          isNullable: true,
        })
      );
    }

    const refreshedTable = await queryRunner.getTable('patients');
    if (!refreshedTable) {
      return;
    }

    const hasFk = refreshedTable.foreignKeys.some((fk) => fk.columnNames.includes('areaId'));
    if (!hasFk) {
      await queryRunner.createForeignKey(
        'patients',
        new TableForeignKey({
          columnNames: ['areaId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'areas',
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        })
      );
    }

    const hasIndex = refreshedTable.indices.some((idx) => idx.columnNames.includes('areaId'));
    if (!hasIndex) {
      await queryRunner.createIndex(
        'patients',
        new TableIndex({
          name: 'IDX_PATIENT_AREA',
          columnNames: ['areaId'],
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patients');
    if (!table) {
      return;
    }

    const index = table.indices.find((idx) => idx.columnNames.includes('areaId'));
    if (index) {
      await queryRunner.dropIndex('patients', index);
    }

    const foreignKeys = table.foreignKeys.filter((fk) => fk.columnNames.includes('areaId'));
    for (const fk of foreignKeys) {
      await queryRunner.dropForeignKey('patients', fk);
    }

    const hasAreaIdColumn = table.findColumnByName('areaId');
    if (hasAreaIdColumn) {
      await queryRunner.dropColumn('patients', 'areaId');
    }
  }
}
