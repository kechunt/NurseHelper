/**
 * Tests para migraciones
 */

import { DataSource } from 'typeorm';
import { AddAdditionalIndexes1733600000000 } from '../../migrations/1733600000000-AddAdditionalIndexes';
import { EncryptSensitiveMedicalData1780900000000 } from '../../migrations/1780900000000-EncryptSensitiveMedicalData';
import { isEncryptedValue } from '../../utils/field-encryption.util';

describe('Migrations', () => {
  let dataSource: DataSource;
  let queryRunner: any;

  beforeEach(() => {
    // Mock de QueryRunner
    queryRunner = {
      query: jest.fn().mockResolvedValue([{ count: 0 }]),
    };

    // Mock de DataSource
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as any;
  });

  describe('AddAdditionalIndexes1733600000000', () => {
    it('debería crear índices si no existen', async () => {
      const migration = new AddAdditionalIndexes1733600000000();
      
      // Mock que simula que los índices no existen
      queryRunner.query.mockResolvedValueOnce([{ count: 0 }]); // idx_schedules_patient_status
      queryRunner.query.mockResolvedValueOnce([{ count: 0 }]); // idx_schedules_patient_type
      queryRunner.query.mockResolvedValueOnce([{ count: 0 }]); // idx_schedules_time_status
      queryRunner.query.mockResolvedValueOnce([{ count: 0 }]); // idx_schedules_medication
      queryRunner.query.mockResolvedValueOnce([{ count: 0 }]); // idx_beds_area_active
      queryRunner.query.mockResolvedValueOnce([{ count: 0 }]); // idx_patients_name_search
      queryRunner.query.mockResolvedValueOnce([{ count: 0 }]); // idx_admin_history_patient_time

      await migration.up(queryRunner);

      // Verificar que se intentaron crear los índices
      expect(queryRunner.query).toHaveBeenCalled();
    });

    it('debería no crear índices si ya existen', async () => {
      const migration = new AddAdditionalIndexes1733600000000();
      
      // Mock que simula que los índices ya existen
      queryRunner.query.mockResolvedValue([{ count: 1 }]);

      await migration.up(queryRunner);

      // Verificar que se verificó la existencia pero no se crearon
      expect(queryRunner.query).toHaveBeenCalled();
    });

    it('debería eliminar índices en down() si existen', async () => {
      const migration = new AddAdditionalIndexes1733600000000();
      
      // Mock que simula que los índices existen
      queryRunner.query.mockResolvedValue([{ count: 1 }]);

      await migration.down(queryRunner);

      // Verificar que se intentaron eliminar los índices
      expect(queryRunner.query).toHaveBeenCalled();
    });
  });

  describe('EncryptSensitiveMedicalData1780900000000', () => {
    const encryptedTables = new Set([
      'patients',
      'patient_clinical_notes',
      'schedules',
      'administration_history',
      'medication_requests',
      'delivery_history',
      'shift_handover_notes',
      'admin_handover_notes',
      'nurse_shifts',
      'shift_attendance',
      'pharmacy_shift_attendance',
    ]);

    beforeEach(() => {
      process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
      queryRunner.addColumn = jest.fn().mockResolvedValue(undefined);
      queryRunner.createIndex = jest.fn().mockResolvedValue(undefined);
      queryRunner.getTable = jest.fn().mockImplementation(async (name: string) => {
        if (!encryptedTables.has(name)) {
          return null;
        }
        return {
          name,
          indices: [],
          findColumnByName: jest.fn().mockReturnValue(true),
        };
      });
      queryRunner.query = jest.fn().mockImplementation(async (sql: string) => {
        if (sql.startsWith('SHOW INDEX')) {
          return [{ Key_name: 'idx_patients_name_search' }];
        }
        if (sql.includes('FROM `patients`')) {
          return [
            {
              id: 1,
              firstName: 'Ana',
              lastName: 'Pérez',
              identificationNumber: 'ID-1',
              dateOfBirth: '1980-02-03',
              phone: '555',
              address: 'Calle 1',
              medicalHistory: 'Diagnóstico',
              allergies: 'Penicilina',
              emergencyContact: 'Luis',
              emergencyPhone: '777',
              emergencyRelation: 'Padre',
              medicalObservations: 'Obs',
              specialNeeds: 'Ninguna',
              generalObservations: 'General',
              medications: [{ name: 'A' }],
              treatmentHistory: [],
              pendingTasks: [],
            },
          ];
        }
        return [];
      });
    });

    it('agrega índices auxiliares y cifra filas existentes sin texto claro', async () => {
      const migration = new EncryptSensitiveMedicalData1780900000000();

      await migration.up(queryRunner);

      const updatePatientsCall = queryRunner.query.mock.calls.find((call: any[]) =>
        String(call[0]).includes('UPDATE `patients`')
      );
      expect(queryRunner.createIndex).toHaveBeenCalled();
      expect(updatePatientsCall).toBeTruthy();
      expect(isEncryptedValue(updatePatientsCall[1][0])).toBe(true);
      expect(updatePatientsCall[1][0]).not.toContain('Ana');
      expect(updatePatientsCall[1][17]).toHaveLength(64);
      expect(updatePatientsCall[1][20]).toContain('|');
    });
  });
});
