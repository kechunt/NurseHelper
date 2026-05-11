import type { Response } from 'express';

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    isInitialized: true,
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../services/shift-handover-note.service', () => ({
  findHandoverNoteForAreaDateAndShift: jest.fn(),
  upsertHandoverNoteForArea: jest.fn(),
  isValidHandoverShiftSlot: jest.requireActual('../../../services/shift-handover-note.service')
    .isValidHandoverShiftSlot,
}));

jest.mock('../../../services/nurse-day-tasks-history.service', () => ({
  fetchNurseDayTasksHistory: jest.fn(),
}));

jest.mock('../../../services/nurse-stats.service', () => ({
  computeNurseStats: jest.fn(),
}));

jest.mock('../../../services/nurse-today-tasks.service', () => ({
  fetchNurseTodayTasksGrouped: jest.fn(),
}));

jest.mock('../../../services/nurse-pharmacy-medications.service', () => ({
  fetchMedicationsForPharmacyGrouped: jest.fn(),
}));

jest.mock('../../../services/pharmacy-contact-by-shift.service', () => ({
  fetchPharmacyContactsByShiftForDate: jest.fn(),
}));

jest.mock('../../../services/nurse-my-beds.service', () => ({
  fetchMyBedsForNurse: jest.fn(),
}));

jest.mock('../../../services/nurse-my-patients.service', () => ({
  fetchMyPatientsForNurse: jest.fn(),
}));

jest.mock('../../../services/nurse-shift-context.service', () => ({
  buildNurseShiftContextPayload: jest.fn(),
}));

jest.mock('../../../services/nurse-patient-details.service', () => ({
  fetchPatientDetailsForNurse: jest.fn(),
}));

jest.mock('../../../services/nurse-administration.service', () => ({
  recordNurseAdministration: jest.fn(),
  fetchNursePatientAdministrationHistoryFormatted: jest.fn(),
  patchAdministrationHistoryForNurse: jest.fn(),
  deleteAdministrationHistoryForNurse: jest.fn(),
}));

jest.mock('../../../services/nurse-treatments.service', () => ({
  createNurseTreatmentSchedules: jest.fn(),
  quickAddNursePatientTreatment: jest.fn(),
  patchPatientTreatmentScheduleAction: jest.fn(),
  patchNursePatientScheduleForNurse: jest.fn(),
  deletePendingNursePatientSchedule: jest.fn(),
}));

import { AppDataSource } from '../../../data-source';
import { computeNurseStats } from '../../../services/nurse-stats.service';
import { fetchMyBedsForNurse } from '../../../services/nurse-my-beds.service';
import { fetchMyPatientsForNurse } from '../../../services/nurse-my-patients.service';
import { fetchNurseTodayTasksGrouped } from '../../../services/nurse-today-tasks.service';
import { fetchNurseDayTasksHistory } from '../../../services/nurse-day-tasks-history.service';
import { fetchPatientDetailsForNurse } from '../../../services/nurse-patient-details.service';
import { fetchMedicationsForPharmacyGrouped } from '../../../services/nurse-pharmacy-medications.service';
import { fetchPharmacyContactsByShiftForDate } from '../../../services/pharmacy-contact-by-shift.service';
import {
  recordNurseAdministration,
  fetchNursePatientAdministrationHistoryFormatted,
  patchAdministrationHistoryForNurse,
  deleteAdministrationHistoryForNurse,
} from '../../../services/nurse-administration.service';
import {
  createNurseTreatmentSchedules,
  quickAddNursePatientTreatment,
  patchPatientTreatmentScheduleAction,
  patchNursePatientScheduleForNurse,
  deletePendingNursePatientSchedule,
} from '../../../services/nurse-treatments.service';
import { buildNurseShiftContextPayload } from '../../../services/nurse-shift-context.service';
import {
  findHandoverNoteForAreaDateAndShift,
  upsertHandoverNoteForArea,
} from '../../../services/shift-handover-note.service';
import { UserRole } from '../../../entities/User';
import type { AuthRequest } from '../../../middleware/auth.middleware';
import {
  getNurseStats,
  getMyBeds,
  getMyPatients,
  getTodayTasks,
  getDayTasksHistory,
  getPatientDetails,
  addTreatment,
  getMedicationsForPharmacy,
  recordAdministration,
  getNurseShiftContext,
  getNurseHandoverNote,
  putNurseHandoverNote,
  patchPatientTreatmentSchedule,
  getPatientHistory,
  quickAddPatientTreatment,
  patchAdministrationHistoryRecord,
  deleteAdministrationHistoryRecord,
  patchNursePatientSchedule,
  deleteNursePatientSchedule,
} from '../../../controllers/nurses.controller';

function resMocks(): { json: jest.Mock; status: jest.Mock; res: Response } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status, res: { status, json } as unknown as Response };
}

function nurseUser(over: Partial<{ id: number; assignedAreaId: number | null }> = {}) {
  return {
    id: 1,
    username: 'n1',
    role: UserRole.NURSE,
    assignedAreaId: 10 as number | null,
    ...over,
  } as AuthRequest['user'];
}

describe('nurses.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource as { isInitialized: boolean }).isInitialized = true;
    (computeNurseStats as jest.Mock).mockResolvedValue({ patients: 2 });
    (fetchMyBedsForNurse as jest.Mock).mockResolvedValue({ ok: true, beds: [{ id: 1 }] });
    (fetchMyPatientsForNurse as jest.Mock).mockResolvedValue({ ok: true, patients: [] });
    (fetchNurseTodayTasksGrouped as jest.Mock).mockResolvedValue({ grouped: [] });
    (fetchNurseDayTasksHistory as jest.Mock).mockResolvedValue({ items: [] });
    (fetchPatientDetailsForNurse as jest.Mock).mockResolvedValue({ ok: true, detail: { id: 5 } });
    (fetchMedicationsForPharmacyGrouped as jest.Mock).mockResolvedValue({ groups: [] });
    (recordNurseAdministration as jest.Mock).mockResolvedValue({ ok: true, body: { saved: true } });
    (fetchNursePatientAdministrationHistoryFormatted as jest.Mock).mockResolvedValue({
      ok: true,
      body: { rows: [] },
    });
    (patchAdministrationHistoryForNurse as jest.Mock).mockResolvedValue({ ok: true, body: { patched: true } });
    (deleteAdministrationHistoryForNurse as jest.Mock).mockResolvedValue({ ok: true, body: { deleted: true } });
    (quickAddNursePatientTreatment as jest.Mock).mockResolvedValue({ ok: true, status: 201, body: { id: 9 } });
    (patchPatientTreatmentScheduleAction as jest.Mock).mockResolvedValue({ ok: true, body: { status: 'ok' } });
    (patchNursePatientScheduleForNurse as jest.Mock).mockResolvedValue({ ok: true, body: { saved: true } });
    (deletePendingNursePatientSchedule as jest.Mock).mockResolvedValue({ ok: true, body: { removed: true } });
    (createNurseTreatmentSchedules as jest.Mock).mockResolvedValue({ ok: true, status: 201, body: { id: 1 } });
    (buildNurseShiftContextPayload as jest.Mock).mockResolvedValue({ shiftSlot: 'morning' });
    (findHandoverNoteForAreaDateAndShift as jest.Mock).mockResolvedValue(null);
    (upsertHandoverNoteForArea as jest.Mock).mockResolvedValue({ id: 1, body: 'texto' });
  });

  describe('getNurseStats', () => {
    it('500 si AppDataSource no está inicializado', async () => {
      (AppDataSource as { isInitialized: boolean }).isInitialized = false;
      const { status, json, res } = resMocks();
      await getNurseStats({ user: nurseUser() } as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(500);
      (AppDataSource as { isInitialized: boolean }).isInitialized = true;
    });

    it('401 sin usuario', async () => {
      const { status, json, res } = resMocks();
      await getNurseStats({ user: undefined } as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(401);
    });

    it('404 si computeNurseStats devuelve null', async () => {
      (computeNurseStats as jest.Mock).mockResolvedValueOnce(null);
      const { status, json, res } = resMocks();
      await getNurseStats({ user: nurseUser() } as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('200 devuelve estadísticas', async () => {
      const json = jest.fn();
      await getNurseStats({ user: nurseUser() } as AuthRequest, { json } as unknown as Response);
      expect(json).toHaveBeenCalledWith({ patients: 2 });
    });
  });

  describe('getMyBeds / getMyPatients', () => {
    it('getMyBeds 401 sin userId', async () => {
      const { status, json, res } = resMocks();
      await getMyBeds({ user: undefined } as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(401);
    });

    it('getMyBeds propaga status del servicio', async () => {
      (fetchMyBedsForNurse as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        body: { message: 'no' },
      });
      const { status, json, res } = resMocks();
      await getMyBeds({ user: nurseUser() } as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(404);
    });

    it('getMyPatients 200', async () => {
      const json = jest.fn();
      await getMyPatients({ user: nurseUser(), query: {} } as unknown as AuthRequest, {
        json,
      } as unknown as Response);
      expect(fetchMyPatientsForNurse).toHaveBeenCalledWith(1, undefined);
      expect(json).toHaveBeenCalledWith([]);
    });
  });

  describe('getTodayTasks', () => {
    it('200', async () => {
      const json = jest.fn();
      await getTodayTasks({ user: nurseUser() } as AuthRequest, { json } as unknown as Response);
      expect(json).toHaveBeenCalledWith({ grouped: [] });
    });
  });

  describe('getDayTasksHistory', () => {
    it('400 fecha inválida', async () => {
      const { status, json, res } = resMocks();
      await getDayTasksHistory(
        { user: nurseUser(), query: { date: '99-99-99' } } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('200', async () => {
      const json = jest.fn();
      await getDayTasksHistory(
        { user: nurseUser(), query: { date: '2030-01-15' } } as unknown as AuthRequest,
        { json } as unknown as Response
      );
      expect(fetchNurseDayTasksHistory).toHaveBeenCalledWith(1, '2030-01-15');
      expect(json).toHaveBeenCalledWith({ items: [] });
    });
  });

  describe('getPatientDetails', () => {
    it('400 id no numérico', async () => {
      const { status, json, res } = resMocks();
      await getPatientDetails({ user: nurseUser(), params: { id: 'x' } } as unknown as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('404 vía servicio', async () => {
      (fetchPatientDetailsForNurse as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        body: { message: 'Paciente no encontrado' },
      });
      const { status, json, res } = resMocks();
      await getPatientDetails({ user: nurseUser(), params: { id: '9' } } as unknown as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(404);
    });
  });

  describe('addTreatment / getMedicationsForPharmacy', () => {
    it('addTreatment delega en servicio', async () => {
      const { status, json, res } = resMocks();
      await addTreatment({ user: nurseUser(), body: { x: 1 } } as unknown as AuthRequest, res);
      expect(createNurseTreatmentSchedules).toHaveBeenCalledWith(1, { x: 1 });
      expect(status).toHaveBeenCalledWith(201);
    });

    it('getMedicationsForPharmacy 200', async () => {
      (fetchMedicationsForPharmacyGrouped as jest.Mock).mockResolvedValueOnce([]);
      (fetchPharmacyContactsByShiftForDate as jest.Mock).mockResolvedValueOnce([]);
      const json = jest.fn();
      await getMedicationsForPharmacy({ user: nurseUser() } as AuthRequest, {
        json,
      } as unknown as Response);
      expect(json).toHaveBeenCalledWith({ medications: [], pharmacyContactsByShift: [] });
    });
  });

  describe('recordAdministration', () => {
    it('403 sin enfermera', async () => {
      const { status, json, res } = resMocks();
      await recordAdministration(
        { user: undefined, body: {} } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(403);
    });
  });

  describe('getNurseShiftContext', () => {
    it('401', async () => {
      const { status, json, res } = resMocks();
      await getNurseShiftContext({ user: undefined } as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(401);
    });

    it('403 si no es enfermería', async () => {
      const { status, json, res } = resMocks();
      await getNurseShiftContext(
        { user: { ...nurseUser(), role: UserRole.ADMIN } } as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(403);
    });

    it('200', async () => {
      const json = jest.fn();
      await getNurseShiftContext({ user: nurseUser() } as AuthRequest, { json } as unknown as Response);
      expect(json).toHaveBeenCalledWith({ shiftSlot: 'morning' });
    });
  });

  describe('getNurseHandoverNote', () => {
    it('403 no enfermera', async () => {
      const { status, json, res } = resMocks();
      await getNurseHandoverNote(
        { user: { ...nurseUser(), role: UserRole.ADMIN } } as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(403);
    });

    it('json note null sin área asignada', async () => {
      const json = jest.fn();
      await getNurseHandoverNote(
        { user: { ...nurseUser(), assignedAreaId: null } } as AuthRequest,
        { json } as unknown as Response
      );
      expect(json).toHaveBeenCalledWith({ note: null });
      expect(findHandoverNoteForAreaDateAndShift).not.toHaveBeenCalled();
    });
  });

  describe('putNurseHandoverNote', () => {
    it('400 sin noteDate o body', async () => {
      const { status, json, res } = resMocks();
      await putNurseHandoverNote(
        { user: nurseUser(), body: {} } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('400 sin área', async () => {
      const { status, json, res } = resMocks();
      await putNurseHandoverNote(
        {
          user: { ...nurseUser(), assignedAreaId: null },
          body: { noteDate: '2030-01-01', body: 'hola' },
        } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('200 guarda nota', async () => {
      const json = jest.fn();
      await putNurseHandoverNote(
        {
          user: nurseUser(),
          body: { noteDate: '2030-02-01', body: '  Contenido válido  ' },
        } as unknown as AuthRequest,
        { json } as unknown as Response
      );
      expect(upsertHandoverNoteForArea).toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({ note: { id: 1, body: 'texto' } });
    });
  });

  describe('patchPatientTreatmentSchedule', () => {
    it('400 IDs inválidos', async () => {
      const { status, json, res } = resMocks();
      await patchPatientTreatmentSchedule(
        {
          user: nurseUser(),
          params: { patientId: 'a', scheduleId: '1' },
          body: {},
        } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('200 delega en servicio', async () => {
      const json = jest.fn();
      await patchPatientTreatmentSchedule(
        {
          user: nurseUser(),
          params: { patientId: '3', scheduleId: '7' },
          body: { action: 'accept' },
        } as unknown as AuthRequest,
        { json } as unknown as Response
      );
      expect(patchPatientTreatmentScheduleAction).toHaveBeenCalledWith(1, 10, 3, 7, { action: 'accept' });
      expect(json).toHaveBeenCalledWith({ status: 'ok' });
    });
  });

  describe('getPatientHistory', () => {
    it('403 sin enfermera', async () => {
      const { status, json, res } = resMocks();
      await getPatientHistory({ user: undefined, params: { patientId: '1' } } as unknown as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(403);
    });

    it('200 devuelve cuerpo del servicio', async () => {
      const json = jest.fn();
      await getPatientHistory(
        { user: nurseUser(), params: { patientId: '12' } } as unknown as AuthRequest,
        { json } as unknown as Response
      );
      expect(fetchNursePatientAdministrationHistoryFormatted).toHaveBeenCalledWith(1, 10, '12');
      expect(json).toHaveBeenCalledWith({ rows: [] });
    });

    it('404 vía servicio', async () => {
      (fetchNursePatientAdministrationHistoryFormatted as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        body: { message: 'no' },
      });
      const { status, json, res } = resMocks();
      await getPatientHistory({ user: nurseUser(), params: { patientId: '1' } } as unknown as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(404);
    });
  });

  describe('quickAddPatientTreatment', () => {
    it('400 patientId inválido', async () => {
      const { status, json, res } = resMocks();
      await quickAddPatientTreatment(
        { user: nurseUser(), params: { patientId: 'x' }, body: {} } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('201 vía servicio', async () => {
      const { status, json, res } = resMocks();
      await quickAddPatientTreatment(
        {
          user: nurseUser(),
          params: { patientId: '4' },
          body: { scheduledTime: '2030-01-01T10:00' },
        } as unknown as AuthRequest,
        res
      );
      expect(quickAddNursePatientTreatment).toHaveBeenCalledWith(1, 10, 4, {
        scheduledTime: '2030-01-01T10:00',
      });
      expect(status).toHaveBeenCalledWith(201);
    });
  });

  describe('patchAdministrationHistoryRecord', () => {
    it('400 IDs inválidos', async () => {
      const { status, json, res } = resMocks();
      await patchAdministrationHistoryRecord(
        {
          user: nurseUser(),
          params: { patientId: '1', historyId: 'z' },
          body: {},
        } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('200', async () => {
      const json = jest.fn();
      await patchAdministrationHistoryRecord(
        {
          user: nurseUser(),
          params: { patientId: '2', historyId: '99' },
          body: { notes: 'n' },
        } as unknown as AuthRequest,
        { json } as unknown as Response
      );
      expect(patchAdministrationHistoryForNurse).toHaveBeenCalledWith(1, 10, 2, 99, { notes: 'n' });
      expect(json).toHaveBeenCalledWith({ patched: true });
    });
  });

  describe('deleteAdministrationHistoryRecord', () => {
    it('400 IDs inválidos', async () => {
      const { status, json, res } = resMocks();
      await deleteAdministrationHistoryRecord(
        { user: nurseUser(), params: { patientId: 'NaN', historyId: '1' }, body: {} } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('200', async () => {
      const json = jest.fn();
      await deleteAdministrationHistoryRecord(
        { user: nurseUser(), params: { patientId: '2', historyId: '5' } } as unknown as AuthRequest,
        { json } as unknown as Response
      );
      expect(deleteAdministrationHistoryForNurse).toHaveBeenCalledWith(1, 10, 2, 5);
      expect(json).toHaveBeenCalledWith({ deleted: true });
    });
  });

  describe('patchNursePatientSchedule', () => {
    it('400 IDs inválidos', async () => {
      const { status, json, res } = resMocks();
      await patchNursePatientSchedule(
        { user: nurseUser(), params: { patientId: '', scheduleId: '1' }, body: {} } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('200', async () => {
      const json = jest.fn();
      await patchNursePatientSchedule(
        {
          user: nurseUser(),
          params: { patientId: '8', scheduleId: '12' },
          body: { description: 'd' },
        } as unknown as AuthRequest,
        { json } as unknown as Response
      );
      expect(patchNursePatientScheduleForNurse).toHaveBeenCalledWith(1, 10, 8, 12, { description: 'd' });
      expect(json).toHaveBeenCalledWith({ saved: true });
    });
  });

  describe('deleteNursePatientSchedule', () => {
    it('400', async () => {
      const { status, json, res } = resMocks();
      await deleteNursePatientSchedule(
        { user: nurseUser(), params: { patientId: '1', scheduleId: 'bad' }, body: {} } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('200', async () => {
      const json = jest.fn();
      await deleteNursePatientSchedule(
        { user: nurseUser(), params: { patientId: '8', scheduleId: '12' } } as unknown as AuthRequest,
        { json } as unknown as Response
      );
      expect(deletePendingNursePatientSchedule).toHaveBeenCalledWith(1, 10, 8, 12);
      expect(json).toHaveBeenCalledWith({ removed: true });
    });
  });

  describe('ramas 500 cuando el servicio lanza', () => {
    it('getNurseStats', async () => {
      (computeNurseStats as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getNurseStats({ user: nurseUser() } as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error al obtener estadísticas' })
      );
    });

    it('getMyBeds', async () => {
      (fetchMyBedsForNurse as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getMyBeds({ user: nurseUser() } as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error al obtener camas' }));
    });

    it('getMyPatients', async () => {
      (fetchMyPatientsForNurse as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getMyPatients({ user: nurseUser(), query: {} } as unknown as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error al obtener pacientes' }));
    });

    it('getTodayTasks', async () => {
      (fetchNurseTodayTasksGrouped as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getTodayTasks({ user: nurseUser() } as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al obtener tareas' });
    });

    it('getDayTasksHistory', async () => {
      (fetchNurseDayTasksHistory as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getDayTasksHistory({ user: nurseUser(), query: {} } as unknown as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al obtener historial del día' });
    });

    it('getPatientDetails', async () => {
      (fetchPatientDetailsForNurse as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getPatientDetails({ user: nurseUser(), params: { id: '1' } } as unknown as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al obtener detalles del paciente' });
    });

    it('addTreatment', async () => {
      (createNurseTreatmentSchedules as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await addTreatment({ user: nurseUser(), body: {} } as unknown as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error al agregar tratamiento', error: 'db' })
      );
    });

    it('getMedicationsForPharmacy', async () => {
      (fetchMedicationsForPharmacyGrouped as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getMedicationsForPharmacy({ user: nurseUser() } as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al obtener medicamentos' });
    });

    it('recordAdministration', async () => {
      (recordNurseAdministration as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await recordAdministration(
        { user: nurseUser(), body: { scheduleId: 1, status: 'given' } } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        message: 'Error interno del servidor al registrar administración',
      });
    });

    it('getPatientHistory', async () => {
      (fetchNursePatientAdministrationHistoryFormatted as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getPatientHistory({ user: nurseUser(), params: { patientId: '1' } } as unknown as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        message: 'Error interno del servidor al obtener historial',
      });
    });

    it('quickAddPatientTreatment', async () => {
      (quickAddNursePatientTreatment as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await quickAddPatientTreatment(
        { user: nurseUser(), params: { patientId: '1' }, body: {} } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al crear tratamiento' });
    });

    it('patchPatientTreatmentSchedule', async () => {
      (patchPatientTreatmentScheduleAction as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await patchPatientTreatmentSchedule(
        { user: nurseUser(), params: { patientId: '1', scheduleId: '2' }, body: {} } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al actualizar tratamiento' });
    });

    it('patchAdministrationHistoryRecord', async () => {
      (patchAdministrationHistoryForNurse as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await patchAdministrationHistoryRecord(
        { user: nurseUser(), params: { patientId: '1', historyId: '2' }, body: {} } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al actualizar historial' });
    });

    it('deleteAdministrationHistoryRecord', async () => {
      (deleteAdministrationHistoryForNurse as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await deleteAdministrationHistoryRecord(
        { user: nurseUser(), params: { patientId: '1', historyId: '2' } } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al eliminar historial' });
    });

    it('patchNursePatientSchedule', async () => {
      (patchNursePatientScheduleForNurse as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await patchNursePatientSchedule(
        { user: nurseUser(), params: { patientId: '1', scheduleId: '2' }, body: {} } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al actualizar horario' });
    });

    it('deleteNursePatientSchedule', async () => {
      (deletePendingNursePatientSchedule as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await deleteNursePatientSchedule(
        { user: nurseUser(), params: { patientId: '1', scheduleId: '2' } } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al eliminar horario' });
    });

    it('getNurseShiftContext', async () => {
      (buildNurseShiftContextPayload as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getNurseShiftContext({ user: nurseUser() } as AuthRequest, res);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al obtener el contexto de turno' });
    });

    it('getNurseHandoverNote', async () => {
      (findHandoverNoteForAreaDateAndShift as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await getNurseHandoverNote(
        { user: nurseUser(), query: { date: '2030-01-01' } } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al leer la nota de entrega' });
    });

    it('putNurseHandoverNote', async () => {
      (upsertHandoverNoteForArea as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { status, json, res } = resMocks();
      await putNurseHandoverNote(
        {
          user: nurseUser(),
          body: { noteDate: '2030-03-01', body: 'contenido válido largo suficiente' },
        } as unknown as AuthRequest,
        res
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ message: 'Error al guardar la nota de entrega' });
    });
  });
});
