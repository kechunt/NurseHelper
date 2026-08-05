import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAuthSessions1781100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('auth_sessions')) return;
    await queryRunner.createTable(new Table({
      name: 'auth_sessions',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'userId', type: 'int' },
        { name: 'tokenHash', type: 'char', length: '64' },
        { name: 'expiresAt', type: 'datetime' },
        { name: 'revokedAt', type: 'datetime', isNullable: true },
        { name: 'lastUsedAt', type: 'datetime', isNullable: true },
        { name: 'rememberMe', type: 'boolean', default: false },
        { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('auth_sessions', new TableIndex({
      name: 'UQ_AUTH_SESSION_TOKEN_HASH', columnNames: ['tokenHash'], isUnique: true,
    }));
    await queryRunner.createIndex('auth_sessions', new TableIndex({
      name: 'IDX_AUTH_SESSION_USER_REVOKED', columnNames: ['userId', 'revokedAt'],
    }));
    await queryRunner.createIndex('auth_sessions', new TableIndex({
      name: 'IDX_AUTH_SESSION_EXPIRES', columnNames: ['expiresAt'],
    }));
    await queryRunner.createForeignKey('auth_sessions', new TableForeignKey({
      columnNames: ['userId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'CASCADE',
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('auth_sessions')) await queryRunner.dropTable('auth_sessions');
  }
}
