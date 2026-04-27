import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class EnforceSinglePatientPerBed1776000000000 implements MigrationInterface {
  private readonly indexName = 'UQ_patients_bedId_single_patient';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patients');
    if (!table) {
      throw new Error('La tabla patients no existe');
    }

    const hasBedId = table.findColumnByName('bedId');
    if (!hasBedId) {
      return;
    }

    // Limpiar datos históricos inconsistentes: una cama con más de un paciente.
    // Conserva el registro con mayor id y desasigna el resto.
    await queryRunner.query(`
      UPDATE patients p
      INNER JOIN (
        SELECT p1.id
        FROM patients p1
        INNER JOIN (
          SELECT bedId, MAX(id) AS keepId
          FROM patients
          WHERE bedId IS NOT NULL
          GROUP BY bedId
          HAVING COUNT(*) > 1
        ) dups ON dups.bedId = p1.bedId
        WHERE p1.id <> dups.keepId
      ) to_clear ON to_clear.id = p.id
      SET p.bedId = NULL
    `);

    const refreshedTable = await queryRunner.getTable('patients');
    if (!refreshedTable) {
      throw new Error('No se pudo refrescar la tabla patients');
    }

    const alreadyHasUnique = refreshedTable.indices.some(
      (idx) =>
        idx.isUnique &&
        idx.columnNames.length === 1 &&
        idx.columnNames[0] === 'bedId'
    );

    if (!alreadyHasUnique) {
      await queryRunner.createIndex(
        'patients',
        new TableIndex({
          name: this.indexName,
          columnNames: ['bedId'],
          isUnique: true,
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patients');
    if (!table) {
      return;
    }

    const index = table.indices.find((idx) => idx.name === this.indexName);
    if (index) {
      await queryRunner.dropIndex('patients', this.indexName);
    }
  }
}

