import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateNurseShiftsTable1733200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla nurse_shifts
    await queryRunner.createTable(
      new Table({
        name: 'nurse_shifts',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nurseId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'shiftId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'dayOfWeek',
            type: 'int',
            isNullable: false,
            comment: '0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado',
          },
          {
            name: 'weekStartDate',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'notes',
            type: 'text',
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
      true,
    );

    // Crear foreign key para nurseId
    await queryRunner.createForeignKey(
      'nurse_shifts',
      new TableForeignKey({
        columnNames: ['nurseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        name: 'FK_nurse_shifts_nurse',
      }),
    );

    // Crear foreign key para shiftId
    await queryRunner.createForeignKey(
      'nurse_shifts',
      new TableForeignKey({
        columnNames: ['shiftId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'shifts',
        onDelete: 'CASCADE',
        name: 'FK_nurse_shifts_shift',
      }),
    );

    // Crear índice único compuesto
    await queryRunner.createIndex(
      'nurse_shifts',
      new TableIndex({
        name: 'idx_unique_nurse_day_week',
        columnNames: ['nurseId', 'dayOfWeek', 'weekStartDate'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar índice
    await queryRunner.dropIndex('nurse_shifts', 'idx_unique_nurse_day_week');

    // Eliminar foreign keys
    await queryRunner.dropForeignKey('nurse_shifts', 'FK_nurse_shifts_shift');
    await queryRunner.dropForeignKey('nurse_shifts', 'FK_nurse_shifts_nurse');

    // Eliminar tabla
    await queryRunner.dropTable('nurse_shifts');
  }
}





