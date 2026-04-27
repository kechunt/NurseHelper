import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePendingRegistrationsTable1775000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pending_registrations',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'username',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'firstName',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'lastName',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['admin', 'nurse', 'supervisor', 'pharmacy'],
            default: "'nurse'",
          },
          {
            name: 'verificationCode',
            type: 'varchar',
            length: '6',
            isNullable: false,
          },
          {
            name: 'verificationCodeExpires',
            type: 'datetime',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'pending_registrations',
      new TableIndex({
        name: 'IDX_PENDING_REG_EXPIRES',
        columnNames: ['verificationCodeExpires'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('pending_registrations', 'IDX_PENDING_REG_EXPIRES');
    await queryRunner.dropTable('pending_registrations');
  }
}
