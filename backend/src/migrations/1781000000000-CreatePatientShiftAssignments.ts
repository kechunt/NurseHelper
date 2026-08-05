import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePatientShiftAssignments1781000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasAssignments = await queryRunner.hasTable('patient_shift_assignments');
    if (!hasAssignments) {
      await queryRunner.createTable(
        new Table({
          name: 'patient_shift_assignments',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'patientId', type: 'int' },
            { name: 'nurseId', type: 'int', isNullable: true },
            { name: 'shiftId', type: 'int' },
            { name: 'date', type: 'date' },
            { name: 'areaId', type: 'int', isNullable: true },
            { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
            { name: 'source', type: 'varchar', length: '20', default: "'handoff'" },
            { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
            { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'patient_shift_assignments',
        new TableIndex({
          name: 'IDX_PSA_DATE_SHIFT_PATIENT',
          columnNames: ['date', 'shiftId', 'patientId'],
          isUnique: true,
        }),
      );
      await queryRunner.createIndex(
        'patient_shift_assignments',
        new TableIndex({ name: 'IDX_PSA_DATE_SHIFT_NURSE', columnNames: ['date', 'shiftId', 'nurseId'] }),
      );
      await queryRunner.createIndex(
        'patient_shift_assignments',
        new TableIndex({ name: 'IDX_PSA_DATE_SHIFT_STATUS', columnNames: ['date', 'shiftId', 'status'] }),
      );

      await queryRunner.createForeignKey(
        'patient_shift_assignments',
        new TableForeignKey({
          columnNames: ['patientId'],
          referencedTableName: 'patients',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'patient_shift_assignments',
        new TableForeignKey({
          columnNames: ['nurseId'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
      await queryRunner.createForeignKey(
        'patient_shift_assignments',
        new TableForeignKey({
          columnNames: ['shiftId'],
          referencedTableName: 'shifts',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'patient_shift_assignments',
        new TableForeignKey({
          columnNames: ['areaId'],
          referencedTableName: 'areas',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    const hasLogs = await queryRunner.hasTable('patient_shift_assignment_logs');
    if (!hasLogs) {
      await queryRunner.createTable(
        new Table({
          name: 'patient_shift_assignment_logs',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'assignmentId', type: 'int', isNullable: true },
            { name: 'patientId', type: 'int' },
            { name: 'shiftId', type: 'int' },
            { name: 'date', type: 'date' },
            { name: 'fromNurseId', type: 'int', isNullable: true },
            { name: 'toNurseId', type: 'int', isNullable: true },
            { name: 'action', type: 'varchar', length: '20' },
            { name: 'source', type: 'varchar', length: '40' },
            { name: 'reason', type: 'varchar', length: '255', isNullable: true },
            { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'patient_shift_assignment_logs',
        new TableIndex({ name: 'IDX_PSAL_PATIENT_DATE_SHIFT', columnNames: ['patientId', 'date', 'shiftId'] }),
      );
      await queryRunner.createIndex(
        'patient_shift_assignment_logs',
        new TableIndex({ name: 'IDX_PSAL_CREATED', columnNames: ['createdAt'] }),
      );

      await queryRunner.createForeignKey(
        'patient_shift_assignment_logs',
        new TableForeignKey({
          columnNames: ['assignmentId'],
          referencedTableName: 'patient_shift_assignments',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
      await queryRunner.createForeignKey(
        'patient_shift_assignment_logs',
        new TableForeignKey({
          columnNames: ['patientId'],
          referencedTableName: 'patients',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'patient_shift_assignment_logs',
        new TableForeignKey({
          columnNames: ['shiftId'],
          referencedTableName: 'shifts',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'patient_shift_assignment_logs',
        new TableForeignKey({
          columnNames: ['fromNurseId'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
      await queryRunner.createForeignKey(
        'patient_shift_assignment_logs',
        new TableForeignKey({
          columnNames: ['toNurseId'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('patient_shift_assignment_logs')) {
      await queryRunner.dropTable('patient_shift_assignment_logs');
    }
    if (await queryRunner.hasTable('patient_shift_assignments')) {
      await queryRunner.dropTable('patient_shift_assignments');
    }
  }
}
