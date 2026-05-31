import type { BedWithPatient, PatientDetail } from '../../services/nurse.service';
import type { BedDisplay, Patient } from './nurse-dashboard.types';
import {
  mapBedsWithPatientForNurseDashboard,
  mapPatientDetailsToPatients,
  mergeClinicalDataIntoBeds,
  resolvePatientForBedModal,
} from './nurse-dashboard-patient-mapping';

function patientDetail(overrides: Partial<PatientDetail> & Pick<PatientDetail, 'id'>): PatientDetail {
  return {
    firstName: 'Ana',
    lastName: 'García',
    identificationNumber: 'ID1',
    bedNumber: '',
    age: 40,
    diagnosis: 'Dx',
    medications: [],
    medicationsDetail: [],
    todaySchedule: [],
    treatmentHistory: [],
    pendingTasks: 0,
    priority: 'normal',
    medicalObservations: '',
    allergies: '',
    specialNeeds: '',
    generalObservations: '',
    ...overrides,
  };
}

describe('nurse-dashboard-patient-mapping', () => {
  describe('mapBedsWithPatientForNurseDashboard', () => {
    it('devuelve array vacío para null/undefined', () => {
      expect(mapBedsWithPatientForNurseDashboard(undefined)).toEqual([]);
      expect(mapBedsWithPatientForNurseDashboard(null)).toEqual([]);
    });

    it('mapea cama con paciente', () => {
      const beds: BedWithPatient[] = [
        {
          id: 1,
          bedNumber: '12A',
          areaId: 3,
          patient: {
            id: 99,
            firstName: 'Luis',
            lastName: 'Pérez',
            age: 55,
            medicalObservations: 'HTA; DM2',
            allergies: '',
          },
        },
      ];
      const out = mapBedsWithPatientForNurseDashboard(beds);
      expect(out.length).toBe(1);
      expect(out[0].bedNumber).toBe('12A');
      expect(out[0].patient?.name).toBe('Luis Pérez');
      expect(out[0].patient?.medicalObservations).toBe('HTA; DM2');
    });

    it('cama sin paciente deja patient null', () => {
      const out = mapBedsWithPatientForNurseDashboard([
        { id: 2, bedNumber: '5', areaId: 1, patient: null },
      ]);
      expect(out[0].patient).toBeNull();
      expect(out[0].patientId).toBeNull();
    });
  });

  describe('mergeClinicalDataIntoBeds', () => {
    it('une diagnosis y clinicalNotes del listado de pacientes', () => {
      const beds: BedDisplay[] = [
        {
          bedNumber: '1A',
          patient: { id: '7', name: 'Luis', age: 50, medicalObservations: '' },
        },
      ];
      const patients: Patient[] = [
        {
          id: '7',
          name: 'Luis',
          bedNumber: '1A',
          age: 50,
          diagnosis: 'Dx API',
          medications: [],
          pendingTasks: 0,
          priority: 'normal',
          clinicalNotes: {
            diagnosis: [{ id: 1, body: 'nota', authorName: null, createdAt: null, legacy: false }],
            medical: [],
            allergies: [],
            specialNeeds: [],
            general: [],
          },
        },
      ];
      const out = mergeClinicalDataIntoBeds(beds, patients);
      expect(out[0].patient?.diagnosis).toBe('Dx API');
      expect(out[0].patient?.clinicalNotes?.diagnosis?.length).toBe(1);
    });
  });

  describe('resolvePatientForBedModal', () => {
    it('prefiere paciente del listado completo', () => {
      const bed: BedDisplay = {
        bedNumber: '2B',
        patient: { id: '3', name: 'Ana', age: 30, medicalObservations: '' },
      };
      const full: Patient = {
        id: '3',
        name: 'Ana Completa',
        bedNumber: '2B',
        age: 30,
        diagnosis: 'Dx',
        medications: [],
        pendingTasks: 0,
        priority: 'normal',
      };
      expect(resolvePatientForBedModal(bed, [full])?.name).toBe('Ana Completa');
    });

    it('construye paciente mínimo desde la cama si no está en listado', () => {
      const bed: BedDisplay = {
        bedNumber: '9Z',
        patient: {
          id: '99',
          name: 'Solo Cama',
          age: 44,
          diagnosis: 'Dx cama',
          medicalObservations: 'obs',
        },
      };
      const resolved = resolvePatientForBedModal(bed, []);
      expect(resolved?.id).toBe('99');
      expect(resolved?.bedNumber).toBe('9Z');
      expect(resolved?.diagnosis).toBe('Dx cama');
    });
  });

  describe('mapPatientDetailsToPatients', () => {
    it('usa bedNumber de la API si es válido', () => {
      const rows = mapPatientDetailsToPatients(
        [patientDetail({ id: 1, bedNumber: '  10B  ', firstName: 'X', lastName: 'Y' })],
        []
      );
      expect(rows[0].bedNumber).toBe('10B');
    });

    it('ignora placeholder y toma cama desde listado de camas', () => {
      const rows = mapPatientDetailsToPatients(
        [patientDetail({ id: 7, bedNumber: 'Sin cama asignada', firstName: 'X', lastName: 'Y' })],
        [{ bedNumber: 'C-1', patient: { id: 7 } }]
      );
      expect(rows[0].bedNumber).toBe('C-1');
    });

    it('rellena diagnosis por defecto y observaciones vacías', () => {
      const rows = mapPatientDetailsToPatients(
        [
          patientDetail({
            id: 2,
            firstName: 'Z',
            lastName: '',
            diagnosis: '',
            medicalObservations: undefined as any,
            allergies: undefined as any,
          }),
        ],
        []
      );
      expect(rows[0].diagnosis).toBe('Sin diagnóstico');
      expect(rows[0].medicalObservations).toBe('');
      expect(rows[0].allergies).toBe('');
      expect(rows[0].clinicalNotes?.diagnosis).toEqual([]);
    });

    it('propaga metadatos de asignación del área', () => {
      const rows = mapPatientDetailsToPatients(
        [
          patientDetail({
            id: 5,
            firstName: 'Luis',
            lastName: 'Pérez',
            isAssignedToMe: true,
            assignedToId: 10,
            assignedToName: 'Enf. Test',
            assignmentStatus: 'assigned',
          }),
        ],
        []
      );
      expect(rows[0].isAssignedToMe).toBe(true);
      expect(rows[0].assignedToId).toBe(10);
      expect(rows[0].assignedToName).toBe('Enf. Test');
      expect(rows[0].assignmentStatus).toBe('assigned');
    });
  });
});
