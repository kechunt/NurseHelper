import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdditionalIndexes1733600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índices adicionales para optimizar queries frecuentes
    // MySQL no soporta IF NOT EXISTS en CREATE INDEX, así que verificamos primero

    // Función helper para crear índice solo si no existe
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

    // Índice compuesto para schedules por paciente y estado
    await createIndexIfNotExists('idx_schedules_patient_status', 'schedules', 'patientId, status');

    // Índice compuesto para schedules por paciente y tipo
    await createIndexIfNotExists('idx_schedules_patient_type', 'schedules', 'patientId, type');

    // Índice compuesto para schedules por fecha programada y estado
    await createIndexIfNotExists('idx_schedules_time_status', 'schedules', 'scheduledTime, status');

    // Índice para búsqueda de medicamentos por nombre
    await createIndexIfNotExists('idx_schedules_medication', 'schedules', 'medication');

    // Índice compuesto para beds por área y estado activo
    await createIndexIfNotExists('idx_beds_area_active', 'beds', 'areaId, isActive');

    // Índice para búsqueda de pacientes por nombre completo
    await createIndexIfNotExists('idx_patients_name_search', 'patients', 'firstName, lastName');

    // Índice para AdministrationHistory por paciente y fecha
    await createIndexIfNotExists('idx_admin_history_patient_time', 'administration_history', 'patientId, scheduledTime');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Función helper para eliminar índice solo si existe
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

    await dropIndexIfExists('idx_schedules_patient_status', 'schedules');
    await dropIndexIfExists('idx_schedules_patient_type', 'schedules');
    await dropIndexIfExists('idx_schedules_time_status', 'schedules');
    await dropIndexIfExists('idx_schedules_medication', 'schedules');
    await dropIndexIfExists('idx_beds_area_active', 'beds');
    await dropIndexIfExists('idx_patients_name_search', 'patients');
    await dropIndexIfExists('idx_admin_history_patient_time', 'administration_history');
  }
}
