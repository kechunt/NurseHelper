import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePatientClinicalNotesTable1780100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('patient_clinical_notes');
    if (exists) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'patient_clinical_notes',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'patientId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'body',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'authorUserId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'patient_clinical_notes',
      new TableForeignKey({
        columnNames: ['patientId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'patients',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'patient_clinical_notes',
      new TableForeignKey({
        columnNames: ['authorUserId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createIndex(
      'patient_clinical_notes',
      new TableIndex({
        name: 'IDX_patient_clinical_notes_patient_category',
        columnNames: ['patientId', 'category'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('patient_clinical_notes');
  }
}
