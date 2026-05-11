import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class PharmacyShiftAttendanceAndRosterOrder1780600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasRoster = await queryRunner.hasColumn('users', 'pharmacyRosterOrder');
    if (!hasRoster) {
      await queryRunner.query('ALTER TABLE `users` ADD `pharmacyRosterOrder` int NULL');
    }

    const exists = await queryRunner.hasTable('pharmacy_shift_attendance');
    if (exists) {
      return;
    }

    await queryRunner.createTable(
      new Table({
        name: 'pharmacy_shift_attendance',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'date', type: 'date', isNullable: false },
          { name: 'shiftId', type: 'int', isNullable: false },
          { name: 'pharmacyUserId', type: 'int', isNullable: false },
          {
            name: 'status',
            type: 'enum',
            enum: ['present', 'absent', 'late', 'justified', 'missing'],
            default: "'absent'",
          },
          { name: 'checkInAt', type: 'datetime', isNullable: true },
          { name: 'checkOutAt', type: 'datetime', isNullable: true },
          { name: 'recordedBy', type: 'int', isNullable: true },
          { name: 'notes', type: 'varchar', length: '500', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
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
      'pharmacy_shift_attendance',
      new TableForeignKey({
        columnNames: ['shiftId'],
        referencedTableName: 'shifts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'pharmacy_shift_attendance',
      new TableForeignKey({
        columnNames: ['pharmacyUserId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'pharmacy_shift_attendance',
      new TableForeignKey({
        columnNames: ['recordedBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createIndex(
      'pharmacy_shift_attendance',
      new TableIndex({
        name: 'UQ_pharmacy_shift_attendance_date_shift_user',
        columnNames: ['date', 'shiftId', 'pharmacyUserId'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'pharmacy_shift_attendance',
      new TableIndex({
        name: 'IDX_pharmacy_shift_attendance_date_shift',
        columnNames: ['date', 'shiftId'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const t = await queryRunner.hasTable('pharmacy_shift_attendance');
    if (t) {
      await queryRunner.dropTable('pharmacy_shift_attendance', true, true, true);
    }
    const hasRoster = await queryRunner.hasColumn('users', 'pharmacyRosterOrder');
    if (hasRoster) {
      await queryRunner.query('ALTER TABLE `users` DROP COLUMN `pharmacyRosterOrder`');
    }
  }
}
