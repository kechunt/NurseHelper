import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddPatientAssignmentTrackingColumns1780200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patients');
    if (!table) return;

    if (!table.findColumnByName('assignmentStatus')) {
      await queryRunner.addColumn(
        'patients',
        new TableColumn({
          name: 'assignmentStatus',
          type: 'varchar',
          length: '20',
          isNullable: false,
          default: "'pending'",
        })
      );
    }

    if (!table.findColumnByName('lastAssignmentAt')) {
      await queryRunner.addColumn(
        'patients',
        new TableColumn({
          name: 'lastAssignmentAt',
          type: 'datetime',
          isNullable: true,
        })
      );
    }

    const refreshed = await queryRunner.getTable('patients');
    if (!refreshed) return;

    const hasAssignmentStatusIdx = refreshed.indices.some((idx) => idx.name === 'IDX_PATIENT_ASSIGNMENT_STATUS');
    if (!hasAssignmentStatusIdx) {
      await queryRunner.createIndex(
        'patients',
        new TableIndex({
          name: 'IDX_PATIENT_ASSIGNMENT_STATUS',
          columnNames: ['assignmentStatus'],
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patients');
    if (!table) return;

    const statusIdx = table.indices.find((idx) => idx.name === 'IDX_PATIENT_ASSIGNMENT_STATUS');
    if (statusIdx) {
      await queryRunner.dropIndex('patients', statusIdx);
    }

    if (table.findColumnByName('lastAssignmentAt')) {
      await queryRunner.dropColumn('patients', 'lastAssignmentAt');
    }
    if (table.findColumnByName('assignmentStatus')) {
      await queryRunner.dropColumn('patients', 'assignmentStatus');
    }
  }
}
