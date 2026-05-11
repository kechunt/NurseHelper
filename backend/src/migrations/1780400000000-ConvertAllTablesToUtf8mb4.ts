import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Convierte todas las tablas base al charset utf8mb4 (tildes, eñe, etc.)
 * y alinea collation. Idempotente en la práctica si ya estaban en utf8mb4.
 */
export class ConvertAllTablesToUtf8mb41780400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const dbRows = (await queryRunner.query(`SELECT DATABASE() AS db`)) as { db: string | null }[];
    const dbName = dbRows?.[0]?.db ?? null;
    if (!dbName) {
      return;
    }

    try {
      await queryRunner.query(
        `ALTER DATABASE \`${String(dbName).replace(/`/g, '')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } catch {
      // Algunos hosts no permiten ALTER DATABASE sin privilegios elevados
    }

    const tables = (await queryRunner.query(
      `SELECT TABLE_NAME AS name FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [dbName]
    )) as { name: string }[];

    for (const row of tables || []) {
      const name = row?.name;
      if (!name || !/^[a-zA-Z0-9_]+$/.test(name)) {
        continue;
      }
      await queryRunner.query(
        `ALTER TABLE \`${name}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    }
  }

  public async down(): Promise<void> {
    // No revertimos charset (riesgo de pérdida de datos)
  }
}
