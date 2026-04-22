import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Índices en columnas de FK de `patients` para listados filtrados y joins frecuentes.
 */
export class AddPatientsFkIndexes1771000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const createIndexIfNotExists = async (indexName: string, tableName: string, columns: string) => {
      const indexExists = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE() 
        AND table_name = '${tableName}' 
        AND index_name = '${indexName}'
      `);

      if (indexExists[0].count === 0) {
        await queryRunner.query(`CREATE INDEX ${indexName} ON ${tableName}(${columns})`);
      }
    };

    await createIndexIfNotExists('idx_patients_bed_id', 'patients', 'bedId');
    await createIndexIfNotExists('idx_patients_assigned_to_id', 'patients', 'assignedToId');
    await createIndexIfNotExists('idx_patients_active_lastname', 'patients', 'isActive, lastName');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dropIndexIfExists = async (indexName: string, tableName: string) => {
      const indexExists = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.statistics 
        WHERE table_schema = DATABASE() 
        AND table_name = '${tableName}' 
        AND index_name = '${indexName}'
      `);

      if (indexExists[0].count > 0) {
        await queryRunner.query(`DROP INDEX ${indexName} ON ${tableName}`);
      }
    };

    await dropIndexIfExists('idx_patients_bed_id', 'patients');
    await dropIndexIfExists('idx_patients_assigned_to_id', 'patients');
    await dropIndexIfExists('idx_patients_active_lastname', 'patients');
  }
}
