import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdatePatientsTable1733180000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patients');
    if (!table) {
      throw new Error('Table patients not found');
    }

    // Agregar nuevas columnas solo si no existen
    const columnsToAdd = [
      { name: 'phone', type: 'varchar', length: '20', isNullable: true },
      { name: 'address', type: 'text', isNullable: true },
      { name: 'emergencyRelation', type: 'varchar', length: '50', isNullable: true },
      { name: 'medicalObservations', type: 'text', isNullable: true },
      { name: 'specialNeeds', type: 'text', isNullable: true },
      { name: 'generalObservations', type: 'text', isNullable: true },
      { name: 'medications', type: 'json', isNullable: true },
      { name: 'treatmentHistory', type: 'json', isNullable: true },
      { name: 'pendingTasks', type: 'json', isNullable: true },
    ];

    for (const columnDef of columnsToAdd) {
      const hasColumn = table.findColumnByName(columnDef.name);
      if (!hasColumn) {
        await queryRunner.addColumn(
          'patients',
          new TableColumn(columnDef as any)
        );
      }
    }

    // Modificar columna emergencyPhone si existe
    const hasEmergencyPhone = table.findColumnByName('emergencyPhone');
    if (hasEmergencyPhone) {
      await queryRunner.changeColumn(
        'patients',
        'emergencyPhone',
        new TableColumn({
          name: 'emergencyPhone',
          type: 'varchar',
          length: '20',
          isNullable: true,
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('patients', 'phone');
    await queryRunner.dropColumn('patients', 'address');
    await queryRunner.dropColumn('patients', 'emergencyRelation');
    await queryRunner.dropColumn('patients', 'medicalObservations');
    await queryRunner.dropColumn('patients', 'specialNeeds');
    await queryRunner.dropColumn('patients', 'generalObservations');
    await queryRunner.dropColumn('patients', 'medications');
    await queryRunner.dropColumn('patients', 'treatmentHistory');
    await queryRunner.dropColumn('patients', 'pendingTasks');
  }
}


