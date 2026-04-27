import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateShiftAttendanceTable1777000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('shift_attendance');
    if (exists) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'shift_attendance',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'shiftId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'nurseId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['present', 'absent', 'late', 'justified'],
            default: "'absent'",
          },
          {
            name: 'checkInAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'checkOutAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'recordedBy',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'varchar',
            length: '500',
            isNullable: true,
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
      'shift_attendance',
      new TableForeignKey({
        columnNames: ['shiftId'],
        referencedTableName: 'shifts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'shift_attendance',
      new TableForeignKey({
        columnNames: ['nurseId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'shift_attendance',
      new TableForeignKey({
        columnNames: ['recordedBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createIndex(
      'shift_attendance',
      new TableIndex({
        name: 'UQ_shift_attendance_date_shift_nurse',
        columnNames: ['date', 'shiftId', 'nurseId'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'shift_attendance',
      new TableIndex({
        name: 'IDX_shift_attendance_date_shift',
        columnNames: ['date', 'shiftId'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('shift_attendance');
    if (!exists) {
      return;
    }

    await queryRunner.dropTable('shift_attendance', true, true, true);
  }
}
