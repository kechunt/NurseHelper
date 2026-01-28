import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailVerificationFields1734000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar campo emailVerified
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'emailVerified',
        type: 'boolean',
        default: false,
      })
    );

    // Agregar campo verificationCode
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'verificationCode',
        type: 'varchar',
        length: '6',
        isNullable: true,
      })
    );

    // Agregar campo verificationCodeExpires
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'verificationCodeExpires',
        type: 'datetime',
        isNullable: true,
      })
    );

    // Marcar todos los usuarios existentes como verificados
    await queryRunner.query(
      `UPDATE users SET emailVerified = true WHERE emailVerified IS NULL OR emailVerified = false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'verificationCodeExpires');
    await queryRunner.dropColumn('users', 'verificationCode');
    await queryRunner.dropColumn('users', 'emailVerified');
  }
}
