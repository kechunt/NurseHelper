import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corrige nombres en `patients` que quedaron con "??" al insertar con sesión no utf8mb4
 * (misma familia de problema que RestoreUtf8DemoNurseNames en users).
 * Idempotente: repetir REPLACE no cambia el resultado una vez corregido.
 */
export class RestoreUtf8CorruptedPatientNames1780700000000 implements MigrationInterface {
  public readonly name = 'RestoreUtf8CorruptedPatientNames1780700000000';

  /** Pares [fragmento corrupto, UTF-8 correcto] para apellidos y nombres frecuentes en demo. */
  private readonly pairs: Array<[string, string]> = [
    ['Mar??a', 'María'],
    ['mar??a', 'maría'],
    ['Jos??', 'José'],
    ['jos??', 'josé'],
    ['Luc??a', 'Lucía'],
    ['Sof??a', 'Sofía'],
    ['P??rez', 'Pérez'],
    ['p??rez', 'pérez'],
    ['Garc??a', 'García'],
    ['garc??a', 'garcía'],
    ['Rodr??guez', 'Rodríguez'],
    ['rodr??guez', 'rodríguez'],
    ['G??mez', 'Gómez'],
    ['g??mez', 'gómez'],
    ['Gonz??lez', 'González'],
    ['gonz??lez', 'gonzález'],
    ['Fern??ndez', 'Fernández'],
    ['fern??ndez', 'fernández'],
    ['L??pez', 'López'],
    ['l??pez', 'lópez'],
    ['Mart??nez', 'Martínez'],
    ['mart??nez', 'martínez'],
    ['Mart??n', 'Martín'],
    ['mart??n', 'martín'],
    ['S??nchez', 'Sánchez'],
    ['s??nchez', 'sánchez'],
    ['Jim??nez', 'Jiménez'],
    ['jim??nez', 'jiménez'],
    ['Hern??ndez', 'Hernández'],
    ['hern??ndez', 'hernández'],
    ['D??az', 'Díaz'],
    ['d??az', 'díaz'],
    ['??lvarez', 'Álvarez'],
    ['Ram??rez', 'Ramírez'],
    ['ram??rez', 'ramírez'],
    ['Mu??oz', 'Muñoz'],
    ['mu??oz', 'muñoz'],
    ['Nu??ez', 'Núñez'],
    ['nu??ez', 'núñez'],
    ['Pe??a', 'Peña'],
    ['pe??a', 'peña'],
    ['V??zquez', 'Vázquez'],
    ['v??zquez', 'vázquez'],
    ['C??rdenas', 'Cárdenas'],
    ['c??rdenas', 'cárdenas'],
    ['Le??n', 'León'],
    ['le??n', 'león'],
    ['Ram??n', 'Ramón'],
    ['ram??n', 'ramón'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cols = ['firstName', 'lastName', 'emergencyContact'] as const;
    for (const col of cols) {
      for (const [bad, good] of this.pairs) {
        await queryRunner.query(
          `UPDATE \`patients\` SET \`${col}\` = REPLACE(\`${col}\`, ?, ?) WHERE \`${col}\` LIKE ?`,
          [bad, good, `%${bad}%`]
        );
      }
    }
  }

  public async down(): Promise<void> {
    // No revertir (irreversible sin snapshot)
  }
}
