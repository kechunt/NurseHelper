import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserNotificationsTable1780800000000 implements MigrationInterface {
  public readonly name = 'UserNotificationsTable1780800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`user_notifications\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`type\` varchar(64) NOT NULL,
        \`severity\` varchar(12) NOT NULL,
        \`requiresAck\` tinyint NOT NULL DEFAULT 0,
        \`title\` varchar(255) NOT NULL,
        \`body\` text NOT NULL,
        \`payload\` json NULL,
        \`dedupeKey\` varchar(220) NOT NULL,
        \`readAt\` datetime NULL,
        \`acknowledgedAt\` datetime NULL,
        \`dismissedAt\` datetime NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_user_notifications_user_dedupe\` (\`userId\`, \`dedupeKey\`),
        INDEX \`IDX_user_notifications_user_created\` (\`userId\`, \`createdAt\`),
        CONSTRAINT \`FK_user_notifications_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_notifications\``);
  }
}
