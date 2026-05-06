import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserPhoneColumns1779000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        length: '30',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'pending_registrations',
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        length: '30',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('pending_registrations', 'phone');
    await queryRunner.dropColumn('users', 'phone');
  }
}
