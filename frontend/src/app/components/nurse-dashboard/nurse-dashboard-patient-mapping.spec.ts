import type { BedWithPatient, PatientDetail } from '../../services/nurse.service';
import {
  mapBedsWithPatientForNurseDashboard,
  mapPatientDetailsToPatients,
  parseConditions,
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
  describe('parseConditions', () => {
    it('devuelve vacío para texto ausente', () => {
      expect(parseConditions('')).toEqual([]);
      expect(parseConditions(null as any)).toEqual([]);
    });

    it('parte por . , ; y recorta; máximo 3 fragmentos', () => {
      expect(parseConditions('Hipertensión, diabetes; asma')).toEqual(['Hipertensión', 'diabetes', 'asma']);
      expect(parseConditions('a.b.c.d')).toEqual(['a', 'b', 'c']);
    });
  });

  describe('mapBedsWithPatientForNurseDashboard', () => {
    it('devuelve array vacío para null/undefined', () => {
      expect(mapBedsWithPatientForNurseDashboard(undefined)).toEqual([]);
      expect(mapBedsWithPatientForNurseDashboard(null)).toEqual([]);
    });

    it('mapea cama con paciente y condiciones', () => {
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
      expect(out[0].patient?.conditions).toEqual(['HTA', 'DM2']);
    });

    it('cama sin paciente deja patient null', () => {
      const out = mapBedsWithPatientForNurseDashboard([
        { id: 2, bedNumber: '5', areaId: 1, patient: null },
      ]);
      expect(out[0].patient).toBeNull();
      expect(out[0].patientId).toBeNull();
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
