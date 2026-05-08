import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { UserRole } from '../entities/User';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import {
  findHandoverNoteForAreaDateAndShift,
  isValidHandoverShiftSlot,
  upsertHandoverNoteForArea,
} from '../services/shift-handover-note.service';
import { ShiftType } from '../entities/Shift';
import { fetchNurseDayTasksHistory } from '../services/nurse-day-tasks-history.service';
import { computeNurseStats } from '../services/nurse-stats.service';
import { fetchNurseTodayTasksGrouped } from '../services/nurse-today-tasks.service';
import { fetchMedicationsForPharmacyGrouped } from '../services/nurse-pharmacy-medications.service';
import { fetchMyBedsForNurse } from '../services/nurse-my-beds.service';
import { fetchMyPatientsForNurse } from '../services/nurse-my-patients.service';
import { buildNurseShiftContextPayload } from '../services/nurse-shift-context.service';
import { fetchPatientDetailsForNurse } from '../services/nurse-patient-details.service';
import {
  recordNurseAdministration,
  fetchNursePatientAdministrationHistoryFormatted,
  patchAdministrationHistoryForNurse,
  deleteAdministrationHistoryForNurse,
} from '../services/nurse-administration.service';
import {
  createNurseTreatmentSchedules,
  quickAddNursePatientTreatment,
  patchPatientTreatmentScheduleAction,
  patchNursePatientScheduleForNurse,
  deletePendingNursePatientSchedule,
} from '../services/nurse-treatments.service';

export const getNurseStats = async (req: AuthRequest, res: Response) => {
  logger.info('🚀 getNurseStats - Iniciando ejecución');
  logger.info('🔍 req.user:', req.user ? { id: req.user.id, username: req.user.username } : 'null');

  try {
    if (!AppDataSource.isInitialized) {
      logger.error('❌ AppDataSource no está inicializado');
      return res.status(500).json({
        message: 'Error de conexión a la base de datos',
        error: 'La base de datos no está inicializada',
      });
    }

    const userId = req.user?.id;

    if (!userId) {
      logger.error('❌ No se encontró userId en el request');
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const stats = await computeNurseStats(userId);
    if (!stats) {
      logger.error(`❌ Usuario con ID ${userId} no encontrado`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(stats);
  } catch (error) {
    logger.error('❌ Error en getNurseStats:', error);
    logger.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    logger.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
      sqlMessage: (error as any)?.sqlMessage,
    });
    res.status(500).json({
      message: 'Error al obtener estadísticas',
      error: error instanceof Error ? error.message : 'Error desconocido',
      details:
        process.env.NODE_ENV === 'development'
          ? {
              name: error instanceof Error ? error.name : 'Unknown',
              stack: error instanceof Error ? error.stack : undefined,
            }
          : undefined,
    });
  }
};

export const getMyBeds = async (req: AuthRequest, res: Response) => {
  logger.info('🚀 getMyBeds - Iniciando ejecución');
  logger.info('🔍 req.user:', req.user ? { id: req.user.id, username: req.user.username } : 'null');

  try {
    if (!AppDataSource.isInitialized) {
      logger.error('❌ AppDataSource no está inicializado en getMyBeds');
      return res.status(500).json({
        message: 'Error de conexión a la base de datos',
        error: 'La base de datos no está inicializada',
      });
    }

    const userId = req.user?.id;

    if (!userId) {
      logger.error('❌ No se encontró userId en getMyBeds');
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const result = await fetchMyBedsForNurse(userId);
    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }
    res.json(result.beds);
  } catch (error) {
    logger.error('❌ Error en getMyBeds:', error);
    logger.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');

    const errorDetails = {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
      sqlMessage: (error as any)?.sqlMessage,
      stack: error instanceof Error ? error.stack : undefined,
    };

    logger.error('Error details:', errorDetails);

    res.status(500).json({
      message: 'Error al obtener camas',
      error: error instanceof Error ? error.message : 'Error desconocido',
      details: errorDetails,
    });
  }
};

export const getMyPatients = async (req: AuthRequest, res: Response) => {
  logger.info('🚀 getMyPatients - Iniciando ejecución');
  logger.info('🔍 req.user:', req.user ? { id: req.user.id, username: req.user.username } : 'null');

  try {
    if (!AppDataSource.isInitialized) {
      logger.error('❌ AppDataSource no está inicializado en getMyPatients');
      return res.status(500).json({
        message: 'Error de conexión a la base de datos',
        error: 'La base de datos no está inicializada',
      });
    }

    const userId = req.user?.id;

    if (!userId) {
      logger.error('❌ No se encontró userId en getMyPatients');
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const qRaw = typeof req.query.q === 'string' ? req.query.q : undefined;
    const result = await fetchMyPatientsForNurse(userId, qRaw);
    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }
    res.json(result.patients);
  } catch (error) {
    logger.error('❌ Error en getMyPatients:', error);
    logger.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    logger.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
      sqlMessage: (error as any)?.sqlMessage,
    });
    res.status(500).json({
      message: 'Error al obtener pacientes',
      error: error instanceof Error ? error.message : 'Error desconocido',
      details:
        process.env.NODE_ENV === 'development'
          ? {
              name: error instanceof Error ? error.name : 'Unknown',
              stack: error instanceof Error ? error.stack : undefined,
            }
          : undefined,
    });
  }
};

export const getTodayTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await fetchNurseTodayTasksGrouped(userId);
    res.json(result);
  } catch (error) {
    logger.error('❌ Error en getTodayTasks:', error);
    res.status(500).json({ message: 'Error al obtener tareas' });
  }
};

/**
 * Historial del día (calendario local del servidor): medicación, tratamientos y chequeos
 * con resultado final (completada o no realizada) para pacientes del área de la enfermera.
 * Query: `date` opcional `YYYY-MM-DD` (por defecto hoy).
 */
export const getDayTasksHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawDate = typeof req.query.date === 'string' ? req.query.date.trim() : '';
    if (rawDate && !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      return res.status(400).json({ message: 'Parámetro date inválido; use YYYY-MM-DD' });
    }

    const payload = await fetchNurseDayTasksHistory(userId, rawDate);
    res.json(payload);
  } catch (error) {
    logger.error('❌ Error en getDayTasksHistory:', error);
    res.status(500).json({ message: 'Error al obtener historial del día' });
  }
};

export const getPatientDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const patientId = parseInt(req.params.id, 10);
    if (Number.isNaN(patientId)) {
      return res.status(400).json({ message: 'ID de paciente inválido' });
    }
    const result = await fetchPatientDetailsForNurse(userId, patientId);
    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }
    res.json(result.detail);
  } catch (error) {
    logger.error('❌ Error en getPatientDetails:', error);
    res.status(500).json({ message: 'Error al obtener detalles del paciente' });
  }
};

export const addTreatment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await createNurseTreatmentSchedules(userId, req.body);
    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }
    return res.status(result.status).json(result.body);
  } catch (error) {
    logger.error('❌ Error en addTreatment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({
      message: 'Error al agregar tratamiento',
      error: errorMessage,
    });
  }
};

export const getMedicationsForPharmacy = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await fetchMedicationsForPharmacyGrouped(userId);
    res.json(result);
  } catch (error) {
    logger.error('❌ Error en getMedicationsForPharmacy:', error);
    res.status(500).json({ message: 'Error al obtener medicamentos' });
  }
};

// Registrar administración de medicamento/tratamiento
export const recordAdministration = async (req: AuthRequest, res: Response) => {
  try {
    const nurse = req.user;
    const { scheduleId, status, reasonNotAdministered, notes } = req.body;

    if (!nurse || !nurse.id) {
      return res.status(403).json({ message: 'Enfermera no autorizada' });
    }

    const result = await recordNurseAdministration({
      nurseId: nurse.id,
      assignedAreaId: nurse.assignedAreaId,
      scheduleId,
      status,
      reasonNotAdministered,
      notes,
    });
    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }
    res.json(result.body);
  } catch (error) {
    logger.error('Error al registrar administración:', error);
    res.status(500).json({ message: 'Error interno del servidor al registrar administración' });
  }
};

export const getPatientHistory = async (req: AuthRequest, res: Response) => {
  try {
    const nurse = req.user;
    const { patientId } = req.params;

    if (!nurse || !nurse.id) {
      return res.status(403).json({ message: 'Enfermera no autorizada' });
    }

    const result = await fetchNursePatientAdministrationHistoryFormatted(
      nurse.id,
      nurse.assignedAreaId,
      patientId
    );
    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }
    res.json(result.body);
  } catch (error) {
    logger.error('Error al obtener historial:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener historial' });
  }
};

/** Alta rápida: un tratamiento/chequeo con fecha-hora (tabla `schedules`, tipo tratamiento). */
export const quickAddPatientTreatment = async (req: AuthRequest, res: Response) => {
  try {
    const nurse = req.user!;
    const patientId = parseInt(req.params.patientId, 10);
    if (isNaN(patientId)) {
      return res.status(400).json({ message: 'ID de paciente inválido' });
    }
    const result = await quickAddNursePatientTreatment(nurse.id, nurse.assignedAreaId, patientId, req.body);
    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }
    return res.status(result.status).json(result.body);
  } catch (error) {
    logger.error('quickAddPatientTreatment:', error);
    res.status(500).json({ message: 'Error al crear tratamiento' });
  }
};

/**
 * Acciones de ciclo de vida para tratamientos/chequeos (no medicamentos):
 * accept → completed + historial; cancel → cancelled; postpone → nueva fecha/hora.
 */
export const patchPatientTreatmentSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const nurse = req.user!;
    const patientId = parseInt(req.params.patientId, 10);
    const scheduleId = parseInt(req.params.scheduleId, 10);
    if (isNaN(patientId) || isNaN(scheduleId)) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }
    const result = await patchPatientTreatmentScheduleAction(
      nurse.id,
      nurse.assignedAreaId,
      patientId,
      scheduleId,
      req.body
    );
    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }
    return res.json(result.body);
  } catch (error) {
    logger.error('patchPatientTreatmentSchedule:', error);
    res.status(500).json({ message: 'Error al actualizar tratamiento' });
  }
};

export const patchAdministrationHistoryRecord = async (req: AuthRequest, res: Response) => {
  try {
    const nurse = req.user!;
    const patientId = parseInt(req.params.patientId, 10);
    const historyId = parseInt(req.params.historyId, 10);
    if (isNaN(patientId) || isNaN(historyId)) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }
    const result = await patchAdministrationHistoryForNurse(
      nurse.id,
      nurse.assignedAreaId,
      patientId,
      historyId,
      req.body
    );
    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }
    res.json(result.body);
  } catch (error) {
    logger.error('patchAdministrationHistoryRecord:', error);
    res.status(500).json({ message: 'Error al actualizar historial' });
  }
};

export const deleteAdministrationHistoryRecord = async (req: AuthRequest, res: Response) => {
  try {
    const nurse = req.user!;
    const patientId = parseInt(req.params.patientId, 10);
    const historyId = parseInt(req.params.historyId, 10);
    if (isNaN(patientId) || isNaN(historyId)) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }
    const result = await deleteAdministrationHistoryForNurse(
      nurse.id,
      nurse.assignedAreaId,
      patientId,
      historyId
    );
    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }
    res.json(result.body);
  } catch (error) {
    logger.error('deleteAdministrationHistoryRecord:', error);
    res.status(500).json({ message: 'Error al eliminar historial' });
  }
};

export const patchNursePatientSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const nurse = req.user!;
    const patientId = parseInt(req.params.patientId, 10);
    const scheduleId = parseInt(req.params.scheduleId, 10);
    if (isNaN(patientId) || isNaN(scheduleId)) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }
    const result = await patchNursePatientScheduleForNurse(
      nurse.id,
      nurse.assignedAreaId,
      patientId,
      scheduleId,
      req.body as {
        description?: string;
        notes?: string;
        scheduledTime?: string;
        status?: string;
      }
    );
    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }
    res.json(result.body);
  } catch (error) {
    logger.error('patchNursePatientSchedule:', error);
    res.status(500).json({ message: 'Error al actualizar horario' });
  }
};

/** Contexto de turno del día para la enfermera autenticada (solo lectura; sin permisos de admin). */
export const getNurseShiftContext = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user;
    if (!me?.id) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    if (me.role !== UserRole.NURSE) {
      return res.status(403).json({ message: 'Solo disponible para el rol enfermería' });
    }
    return res.json(await buildNurseShiftContextPayload(me.id));
  } catch (error) {
    logger.error('getNurseShiftContext:', error);
    return res.status(500).json({ message: 'Error al obtener el contexto de turno' });
  }
};

export const deleteNursePatientSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const nurse = req.user!;
    const patientId = parseInt(req.params.patientId, 10);
    const scheduleId = parseInt(req.params.scheduleId, 10);
    if (isNaN(patientId) || isNaN(scheduleId)) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }
    const result = await deletePendingNursePatientSchedule(
      nurse.id,
      nurse.assignedAreaId,
      patientId,
      scheduleId
    );
    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }
    res.json(result.body);
  } catch (error) {
    logger.error('deleteNursePatientSchedule:', error);
    res.status(500).json({ message: 'Error al eliminar horario' });
  }
};


/** Query `shift`: morning | afternoon | night — nota por área + fecha + turno. */
export const getNurseHandoverNote = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user;
    if (!me?.id) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    if (me.role !== UserRole.NURSE) {
      return res.status(403).json({ message: 'Solo disponible para el rol enfermería' });
    }
    if (!me.assignedAreaId) {
      return res.json({ note: null });
    }
    const raw =
      typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : new Date().toISOString().split('T')[0];

    const shiftRaw = typeof req.query.shift === 'string' ? req.query.shift : ShiftType.MORNING;
    const shiftSlot = isValidHandoverShiftSlot(shiftRaw) ? shiftRaw : ShiftType.MORNING;

    const note = await findHandoverNoteForAreaDateAndShift(me.assignedAreaId, raw, shiftSlot);
    if (!note) {
      return res.json({ note: null });
    }
    return res.json({ note });
  } catch (error) {
    logger.error('getNurseHandoverNote:', error);
    return res.status(500).json({ message: 'Error al leer la nota de entrega' });
  }
};

export const putNurseHandoverNote = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user;
    if (!me?.id) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    if (me.role !== UserRole.NURSE) {
      return res.status(403).json({ message: 'Solo disponible para el rol enfermería' });
    }
    if (!me.assignedAreaId) {
      return res.status(400).json({ message: 'Sin área asignada; no se puede guardar la nota' });
    }

    const { noteDate, shiftSlot: shiftBody, body } = req.body as {
      noteDate?: string;
      shiftSlot?: string;
      body?: string;
    };
    if (!noteDate || typeof body !== 'string') {
      return res.status(400).json({ message: 'noteDate y body son requeridos' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
      return res.status(400).json({ message: 'noteDate debe ser YYYY-MM-DD' });
    }
    const shiftSlotParsed =
      typeof shiftBody === 'string' && isValidHandoverShiftSlot(shiftBody) ? shiftBody : ShiftType.MORNING;
    const trimmed = body.trim();
    if (!trimmed.length) {
      return res.status(400).json({ message: 'El texto no puede estar vacío' });
    }
    if (trimmed.length > 8000) {
      return res.status(400).json({ message: 'Texto demasiado largo (máx. 8000 caracteres)' });
    }

    const note = await upsertHandoverNoteForArea({
      areaId: me.assignedAreaId,
      authorUserId: me.id,
      noteDate,
      shiftSlot: shiftSlotParsed,
      body: trimmed,
    });

    return res.json({ note });
  } catch (error) {
    logger.error('putNurseHandoverNote:', error);
    return res.status(500).json({ message: 'Error al guardar la nota de entrega' });
  }
};

