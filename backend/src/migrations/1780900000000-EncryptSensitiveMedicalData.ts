import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';
import {
  assertFieldEncryptionConfigured,
  buildPatientSearchTokenHashes,
  encryptJsonValue,
  encryptNullableDate,
  encryptNullableString,
  secureHash,
} from '../utils/field-encryption.util';

type Row = Record<string, any>;

interface EncryptedColumnSpec {
  name: string;
  nullable?: boolean;
  json?: boolean;
  date?: boolean;
}

export class EncryptSensitiveMedicalData1780900000000 implements MigrationInterface {
  name = 'EncryptSensitiveMedicalData1780900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    assertFieldEncryptionConfigured();

    await this.preparePatientSearchColumns(queryRunner);
    await this.expandEncryptedColumnTypes(queryRunner);
    await this.backfillPatients(queryRunner);
    await this.backfillTable(queryRunner, 'patient_clinical_notes', [{ name: 'body' }]);
    await this.backfillTable(queryRunner, 'schedules', [
      { name: 'description' },
      { name: 'notes', nullable: true },
      { name: 'medication', nullable: true },
      { name: 'dosage', nullable: true },
    ]);
    await this.backfillTable(queryRunner, 'administration_history', [
      { name: 'description' },
      { name: 'medication', nullable: true },
      { name: 'dosage', nullable: true },
      { name: 'notes', nullable: true },
      { name: 'reasonNotAdministered', nullable: true },
    ]);
    await this.backfillTable(queryRunner, 'medication_requests', [
      { name: 'dosage' },
      { name: 'patientsInfo', json: true },
      { name: 'notes', nullable: true },
    ]);
    await this.backfillTable(queryRunner, 'delivery_history', [
      { name: 'dosage' },
      { name: 'patients', json: true },
      { name: 'notes', nullable: true },
    ]);
    await this.backfillTable(queryRunner, 'shift_handover_notes', [{ name: 'body' }]);
    await this.backfillTable(queryRunner, 'admin_handover_notes', [{ name: 'body' }]);
    await this.backfillTable(queryRunner, 'nurse_shifts', [{ name: 'notes', nullable: true }]);
    await this.backfillTable(queryRunner, 'shift_attendance', [{ name: 'notes', nullable: true }]);
    await this.backfillTable(queryRunner, 'pharmacy_shift_attendance', [{ name: 'notes', nullable: true }]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patients');
    if (!table) {
      return;
    }
    for (const indexName of [
      'idx_patients_identification_hash',
      'idx_patients_first_name_hash',
      'idx_patients_last_name_hash',
    ]) {
      const index = table.indices.find((idx) => idx.name === indexName);
      if (index) {
        await queryRunner.dropIndex('patients', index);
      }
    }
    for (const columnName of [
      'firstNameSearchHash',
      'lastNameSearchHash',
      'identificationNumberSearchHash',
      'patientSearchTokenHashes',
    ]) {
      if (table.findColumnByName(columnName)) {
        await queryRunner.dropColumn('patients', columnName);
      }
    }
  }

  private async preparePatientSearchColumns(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patients');
    if (!table) {
      throw new Error('La tabla patients no existe');
    }

    await this.dropIndexesContainingColumns(queryRunner, 'patients', [
      'firstName',
      'lastName',
      'identificationNumber',
    ]);

    const columns: TableColumn[] = [
      new TableColumn({ name: 'firstNameSearchHash', type: 'varchar', length: '64', isNullable: true }),
      new TableColumn({ name: 'lastNameSearchHash', type: 'varchar', length: '64', isNullable: true }),
      new TableColumn({
        name: 'identificationNumberSearchHash',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
      new TableColumn({ name: 'patientSearchTokenHashes', type: 'longtext', isNullable: true }),
    ];

    for (const column of columns) {
      if (!table.findColumnByName(column.name)) {
        await queryRunner.addColumn('patients', column);
      }
    }

    const refreshed = await queryRunner.getTable('patients');
    if (!refreshed) {
      throw new Error('No se pudo refrescar la tabla patients');
    }
    await this.createIndexIfMissing(
      queryRunner,
      refreshed,
      new TableIndex({
        name: 'idx_patients_identification_hash',
        columnNames: ['identificationNumberSearchHash'],
        isUnique: true,
      })
    );
    await this.createIndexIfMissing(
      queryRunner,
      refreshed,
      new TableIndex({ name: 'idx_patients_first_name_hash', columnNames: ['firstNameSearchHash'] })
    );
    await this.createIndexIfMissing(
      queryRunner,
      refreshed,
      new TableIndex({ name: 'idx_patients_last_name_hash', columnNames: ['lastNameSearchHash'] })
    );
  }

  private async expandEncryptedColumnTypes(queryRunner: QueryRunner): Promise<void> {
    await this.modifyColumns(queryRunner, 'patients', [
      ['firstName', 'TEXT NOT NULL'],
      ['lastName', 'TEXT NOT NULL'],
      ['identificationNumber', 'TEXT NULL'],
      ['dateOfBirth', 'TEXT NULL'],
      ['phone', 'TEXT NULL'],
      ['address', 'TEXT NULL'],
      ['medicalHistory', 'TEXT NULL'],
      ['allergies', 'TEXT NULL'],
      ['emergencyContact', 'TEXT NULL'],
      ['emergencyPhone', 'TEXT NULL'],
      ['emergencyRelation', 'TEXT NULL'],
      ['medicalObservations', 'TEXT NULL'],
      ['specialNeeds', 'TEXT NULL'],
      ['generalObservations', 'TEXT NULL'],
      ['medications', 'LONGTEXT NULL'],
      ['treatmentHistory', 'LONGTEXT NULL'],
      ['pendingTasks', 'LONGTEXT NULL'],
    ]);
    await this.modifyColumns(queryRunner, 'schedules', [
      ['description', 'TEXT NOT NULL'],
      ['notes', 'TEXT NULL'],
      ['medication', 'TEXT NULL'],
      ['dosage', 'TEXT NULL'],
    ]);
    await this.modifyColumns(queryRunner, 'medication_requests', [
      ['dosage', 'TEXT NOT NULL'],
      ['patientsInfo', 'LONGTEXT NOT NULL'],
      ['notes', 'TEXT NULL'],
    ]);
    await this.modifyColumns(queryRunner, 'delivery_history', [
      ['dosage', 'TEXT NOT NULL'],
      ['patients', 'LONGTEXT NOT NULL'],
      ['notes', 'TEXT NULL'],
    ]);
    await this.modifyColumns(queryRunner, 'shift_attendance', [['notes', 'TEXT NULL']]);
    await this.modifyColumns(queryRunner, 'pharmacy_shift_attendance', [['notes', 'TEXT NULL']]);
  }

  private async modifyColumns(queryRunner: QueryRunner, tableName: string, columns: Array<[string, string]>): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (!table) {
      return;
    }
    for (const [columnName, typeSql] of columns) {
      if (table.findColumnByName(columnName)) {
        await queryRunner.query(`ALTER TABLE \`${tableName}\` MODIFY \`${columnName}\` ${typeSql}`);
      }
    }
  }

  private async backfillPatients(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patients');
    if (!table) {
      return;
    }
    const rows: Row[] = await queryRunner.query(
      'SELECT `id`, `firstName`, `lastName`, `identificationNumber`, `dateOfBirth`, `phone`, `address`, `medicalHistory`, `allergies`, `emergencyContact`, `emergencyPhone`, `emergencyRelation`, `medicalObservations`, `specialNeeds`, `generalObservations`, `medications`, `treatmentHistory`, `pendingTasks` FROM `patients`'
    );

    for (const row of rows) {
      const firstName = row.firstName ?? '';
      const lastName = row.lastName ?? '';
      const identificationNumber = row.identificationNumber ?? null;
      await queryRunner.query(
        `UPDATE \`patients\`
         SET \`firstName\` = ?,
             \`lastName\` = ?,
             \`identificationNumber\` = ?,
             \`dateOfBirth\` = ?,
             \`phone\` = ?,
             \`address\` = ?,
             \`medicalHistory\` = ?,
             \`allergies\` = ?,
             \`emergencyContact\` = ?,
             \`emergencyPhone\` = ?,
             \`emergencyRelation\` = ?,
             \`medicalObservations\` = ?,
             \`specialNeeds\` = ?,
             \`generalObservations\` = ?,
             \`medications\` = ?,
             \`treatmentHistory\` = ?,
             \`pendingTasks\` = ?,
             \`firstNameSearchHash\` = ?,
             \`lastNameSearchHash\` = ?,
             \`identificationNumberSearchHash\` = ?,
             \`patientSearchTokenHashes\` = ?
         WHERE \`id\` = ?`,
        [
          encryptNullableString(firstName) ?? '',
          encryptNullableString(lastName) ?? '',
          encryptNullableString(identificationNumber),
          encryptNullableDate(row.dateOfBirth),
          encryptNullableString(row.phone),
          encryptNullableString(row.address),
          encryptNullableString(row.medicalHistory),
          encryptNullableString(row.allergies),
          encryptNullableString(row.emergencyContact),
          encryptNullableString(row.emergencyPhone),
          encryptNullableString(row.emergencyRelation),
          encryptNullableString(row.medicalObservations),
          encryptNullableString(row.specialNeeds),
          encryptNullableString(row.generalObservations),
          encryptJsonValue(row.medications),
          encryptJsonValue(row.treatmentHistory),
          encryptJsonValue(row.pendingTasks),
          secureHash(firstName),
          secureHash(lastName),
          secureHash(identificationNumber),
          buildPatientSearchTokenHashes({ firstName, lastName, identificationNumber }),
          row.id,
        ]
      );
    }
  }

  private async backfillTable(
    queryRunner: QueryRunner,
    tableName: string,
    columns: EncryptedColumnSpec[]
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (!table) {
      return;
    }
    const existingColumns = columns.filter((column) => table.findColumnByName(column.name));
    if (existingColumns.length === 0) {
      return;
    }

    const selectColumns = ['id', ...existingColumns.map((column) => column.name)]
      .map((column) => `\`${column}\``)
      .join(', ');
    const rows: Row[] = await queryRunner.query(`SELECT ${selectColumns} FROM \`${tableName}\``);
    for (const row of rows) {
      const setSql = existingColumns.map((column) => `\`${column.name}\` = ?`).join(', ');
      const values = existingColumns.map((column) => this.encryptColumnValue(row[column.name], column));
      await queryRunner.query(`UPDATE \`${tableName}\` SET ${setSql} WHERE \`id\` = ?`, [...values, row.id]);
    }
  }

  private encryptColumnValue(value: unknown, column: EncryptedColumnSpec): string | null {
    if (column.json) {
      return encryptJsonValue(value ?? []);
    }
    if (column.date) {
      return encryptNullableDate(value as string | Date | null | undefined);
    }
    if (column.nullable) {
      return encryptNullableString(value as string | null | undefined);
    }
    return encryptNullableString(value == null ? '' : String(value)) ?? '';
  }

  private async dropIndexesContainingColumns(
    queryRunner: QueryRunner,
    tableName: string,
    columnNames: string[]
  ): Promise<void> {
    const placeholders = columnNames.map(() => '?').join(', ');
    const rows: Array<{ Key_name: string }> = await queryRunner.query(
      `SHOW INDEX FROM \`${tableName}\` WHERE Column_name IN (${placeholders})`,
      columnNames
    );
    const indexNames = Array.from(new Set(rows.map((row) => row.Key_name).filter((name) => name !== 'PRIMARY')));
    for (const indexName of indexNames) {
      await queryRunner.query(`DROP INDEX \`${indexName}\` ON \`${tableName}\``);
    }
  }

  private async createIndexIfMissing(queryRunner: QueryRunner, table: any, index: TableIndex): Promise<void> {
    if (!table.indices.some((idx: TableIndex) => idx.name === index.name)) {
      await queryRunner.createIndex(table.name, index);
    }
  }
}
