import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMedicationInventoryMovementsTable1774000000000 implements MigrationInterface {
  name = 'CreateMedicationInventoryMovementsTable1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('medication_inventory_movements');
    if (hasTable) {
      return;
    }

    await queryRunner.query(`
      CREATE TABLE \`medication_inventory_movements\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`medicationId\` int NOT NULL,
        \`movementType\` enum('entry','exit','adjustment','delivery') NOT NULL,
        \`quantityDelta\` int NOT NULL,
        \`stockBefore\` int NOT NULL,
        \`stockAfter\` int NOT NULL,
        \`reason\` text NULL,
        \`performedById\` int NULL,
        \`medicationRequestId\` int NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_mim_medication_created\` (\`medicationId\`, \`createdAt\`),
        CONSTRAINT \`FK_mim_medication\` FOREIGN KEY (\`medicationId\`) REFERENCES \`medications\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT \`FK_mim_user\` FOREIGN KEY (\`performedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_mim_request\` FOREIGN KEY (\`medicationRequestId\`) REFERENCES \`medication_requests\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('medication_inventory_movements');
    if (!hasTable) {
      return;
    }
    await queryRunner.query('DROP TABLE `medication_inventory_movements`');
  }
}
