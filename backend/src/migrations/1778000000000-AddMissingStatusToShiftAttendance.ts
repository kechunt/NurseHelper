import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingStatusToShiftAttendance1778000000000 implements MigrationInterface {
  name = 'AddMissingStatusToShiftAttendance1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `shift_attendance` MODIFY `status` enum('present','absent','late','justified','missing') NOT NULL DEFAULT 'absent'"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE `shift_attendance` SET `status` = 'absent' WHERE `status` = 'missing'"
    );
    await queryRunner.query(
      "ALTER TABLE `shift_attendance` MODIFY `status` enum('present','absent','late','justified') NOT NULL DEFAULT 'absent'"
    );
  }
}
