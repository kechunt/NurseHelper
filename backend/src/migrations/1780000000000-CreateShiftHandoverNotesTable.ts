import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateShiftHandoverNotesTable1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('shift_handover_notes');
    if (exists) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'shift_handover_notes',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'areaId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'note_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'body',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'author_user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'shift_handover_notes',
      new TableForeignKey({
        columnNames: ['areaId'],
        referencedTableName: 'areas',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'shift_handover_notes',
      new TableForeignKey({
        columnNames: ['author_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createIndex(
      'shift_handover_notes',
      new TableIndex({
        name: 'UQ_shift_handover_area_date',
        columnNames: ['areaId', 'note_date'],
        isUnique: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('shift_handover_notes');
    if (!exists) {
      return;
    }
    await queryRunner.dropTable('shift_handover_notes', true, true, true);
  }
}
