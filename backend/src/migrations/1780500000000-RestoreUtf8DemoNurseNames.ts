import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Restaura firstName/lastName en UTF-8 para cuentas demo y plantilla del proyecto
 * cuando quedaron como "??" por cliente/sesión en latin1 al insertar.
 * Idempotente: sobrescribe por username conocido (no toca otros usuarios).
 */
export class RestoreUtf8DemoNurseNames1780500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const fixes: Array<{ username: string; firstName: string; lastName: string }> = [
      { username: 'enfermera', firstName: 'Ana', lastName: 'García' },
      { username: 'enfermera2', firstName: 'María', lastName: 'López' },
      { username: 'enfermera3', firstName: 'Lucía', lastName: 'Martínez' },
      { username: 'enfermera4', firstName: 'Sofía', lastName: 'Rodríguez' },
      { username: 'marta.martinez', firstName: 'Marta', lastName: 'Martínez' },
      { username: 'laura.rivera', firstName: 'Laura', lastName: 'Rivera' },
    ];

    for (const f of fixes) {
      await queryRunner.query(
        `UPDATE \`users\` SET \`firstName\` = ?, \`lastName\` = ? WHERE \`username\` = ?`,
        [f.firstName, f.lastName, f.username]
      );
    }
  }

  public async down(): Promise<void> {
    // No revertimos nombres (irreversible sin snapshot)
  }
}
