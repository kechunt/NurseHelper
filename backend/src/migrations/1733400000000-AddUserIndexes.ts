import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddUserIndexes1733400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índice para role (usado frecuentemente en filtros)
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USER_ROLE',
        columnNames: ['role'],
      })
    );

    // Índice para isActive (usado frecuentemente en filtros)
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USER_IS_ACTIVE',
        columnNames: ['isActive'],
      })
    );

    // Índice compuesto para role + isActive (consultas comunes)
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USER_ROLE_ACTIVE',
        columnNames: ['role', 'isActive'],
      })
    );

    // Índice para createdAt (usado en ordenamiento)
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USER_CREATED_AT',
        columnNames: ['createdAt'],
      })
    );

    // Índice para assignedAreaId (usado en consultas de enfermeras)
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USER_ASSIGNED_AREA',
        columnNames: ['assignedAreaId'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_USER_ROLE');
    await queryRunner.dropIndex('users', 'IDX_USER_IS_ACTIVE');
    await queryRunner.dropIndex('users', 'IDX_USER_ROLE_ACTIVE');
    await queryRunner.dropIndex('users', 'IDX_USER_CREATED_AT');
    await queryRunner.dropIndex('users', 'IDX_USER_ASSIGNED_AREA');
  }
}
