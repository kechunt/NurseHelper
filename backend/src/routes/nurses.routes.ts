import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getNurseStats,
  getMyBeds,
  getMyPatients,
  getTodayTasks,
  getDayTasksHistory,
  getMedicationsForPharmacy,
  getPatientDetails,
  addTreatment,
  recordAdministration,
  getPatientHistory,
  patchAdministrationHistoryRecord,
  deleteAdministrationHistoryRecord,
  patchNursePatientSchedule,
  deleteNursePatientSchedule,
  quickAddPatientTreatment,
  patchPatientTreatmentSchedule,
  getNurseShiftContext,
  getNurseHandoverNote,
  putNurseHandoverNote,
} from '../controllers/nurses.controller';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/nurse/stats:
 *   get:
 *     summary: Obtener estadísticas de la enfermera
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de la enfermera
 */
router.get('/stats', getNurseStats);

/**
 * @swagger
 * /api/nurse/shift-context:
 *   get:
 *     summary: Contexto del turno actual (enfermera autenticada)
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contexto del turno (área, turno, fechas, etc.)
 */
router.get('/shift-context', getNurseShiftContext);

/**
 * @swagger
 * /api/nurse/handover-notes:
 *   get:
 *     summary: Obtener nota de entrega de turno (por fecha)
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha (YYYY-MM-DD). Si se omite, usa hoy.
 *     responses:
 *       200:
 *         description: Nota de entrega del turno
 *
 *   put:
 *     summary: Guardar/actualizar nota de entrega de turno (por fecha)
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, body]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               body:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nota guardada
 */
router.get('/handover-notes', getNurseHandoverNote);
router.put('/handover-notes', putNurseHandoverNote);

/**
 * @swagger
 * /api/nurse/beds:
 *   get:
 *     summary: Obtener camas asignadas a la enfermera
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de camas asignadas
 */
router.get('/beds', getMyBeds);

/**
 * @swagger
 * /api/nurse/patients:
 *   get:
 *     summary: Obtener pacientes asignados a la enfermera
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pacientes asignados
 */
/** Lista de pacientes; query opcional `q` filtra en servidor (nombre, cama, id, identificación). */
router.get('/patients', getMyPatients);

/**
 * @swagger
 * /api/nurse/patients/{id}:
 *   get:
 *     summary: Obtener detalles de un paciente
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalles del paciente
 */
/**
 * @swagger
 * /api/nurse/patients/{patientId}/administration-history/{historyId}:
 *   patch:
 *     summary: Editar un registro del historial de administración
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: historyId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *               reasonNotAdministered:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [administered, not_administered, missed]
 *     responses:
 *       200:
 *         description: Registro actualizado
 *
 *   delete:
 *     summary: Eliminar un registro del historial de administración
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: historyId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Registro eliminado
 */
router.patch(
  '/patients/:patientId/administration-history/:historyId',
  patchAdministrationHistoryRecord
);
router.delete(
  '/patients/:patientId/administration-history/:historyId',
  deleteAdministrationHistoryRecord
);
/**
 * @swagger
 * /api/nurse/patients/{patientId}/schedules/{scheduleId}:
 *   patch:
 *     summary: Editar una tarea/horario del paciente (enfermería)
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description: { type: string }
 *               notes: { type: string }
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [pending, completed, missed, cancelled]
 *     responses:
 *       200:
 *         description: Horario actualizado
 *
 *   delete:
 *     summary: Eliminar un horario/tarea del paciente
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Horario eliminado
 */
router.patch('/patients/:patientId/schedules/:scheduleId', patchNursePatientSchedule);
router.delete('/patients/:patientId/schedules/:scheduleId', deleteNursePatientSchedule);
/**
 * @swagger
 * /api/nurse/patients/{patientId}/treatments/quick:
 *   post:
 *     summary: Alta rápida de tratamiento para un paciente (una sola fecha/hora)
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, date, time]
 *             properties:
 *               description: { type: string }
 *               date: { type: string, format: date }
 *               time: { type: string, format: time }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Tratamiento creado
 */
router.post('/patients/:patientId/treatments/quick', quickAddPatientTreatment);
/**
 * @swagger
 * /api/nurse/patients/{patientId}/treatment-schedules/{scheduleId}:
 *   patch:
 *     summary: Acción sobre un tratamiento/chequeo (aceptar/posponer/cancelar)
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, postpone, cancel]
 *               newScheduledTime:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Acción aplicada
 */
router.patch('/patients/:patientId/treatment-schedules/:scheduleId', patchPatientTreatmentSchedule);

router.get('/patients/:id', getPatientDetails);

/**
 * @swagger
 * /api/nurse/tasks/today:
 *   get:
 *     summary: Obtener tareas del día de hoy
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tareas del día
 */
/**
 * @swagger
 * /api/nurse/tasks/day-history:
 *   get:
 *     summary: Historial de tareas del día (para exportación/seguimiento)
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha (YYYY-MM-DD). Si se omite, usa hoy.
 *     responses:
 *       200:
 *         description: Resumen/estado por hora del día solicitado
 */
router.get('/tasks/day-history', getDayTasksHistory);
router.get('/tasks/today', getTodayTasks);

/**
 * @swagger
 * /api/nurse/medications/pharmacy:
 *   get:
 *     summary: Obtener medicamentos para farmacia
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de medicamentos
 */
router.get('/medications/pharmacy', getMedicationsForPharmacy);

/**
 * @swagger
 * /api/nurse/treatments:
 *   post:
 *     summary: Agregar tratamiento a paciente
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - description
 *               - scheduleType
 *             properties:
 *               patientId:
 *                 type: integer
 *               description:
 *                 type: string
 *               scheduleType:
 *                 type: string
 *                 enum: [single, recurring]
 *                 description: Tipo de programación (única o recurrente)
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha y hora para tarea única (requerido si scheduleType es 'single')
 *               time:
 *                 type: string
 *                 format: time
 *                 description: Hora para tarea recurrente (requerido si scheduleType es 'recurring')
 *               daysOfWeek:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Días de la semana para tarea recurrente (0=domingo, 6=sábado)
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tratamiento agregado exitosamente
 */
router.post('/treatments', addTreatment);

/**
 * @swagger
 * /api/nurse/administration:
 *   post:
 *     summary: Registrar administración de medicamento o tratamiento
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduleId
 *               - status
 *             properties:
 *               scheduleId:
 *                 type: integer
 *                 description: ID del horario/tarea
 *               status:
 *                 type: string
 *                 enum: [administered, not_administered, missed]
 *                 description: Estado de la administración
 *               reasonNotAdministered:
 *                 type: string
 *                 description: Razón si no se administró (requerido si status es 'not_administered')
 *               notes:
 *                 type: string
 *                 description: Notas adicionales
 *     responses:
 *       201:
 *         description: Administración registrada exitosamente
 */
router.post('/administration', recordAdministration);

/**
 * @swagger
 * /api/nurse/patients/{patientId}/history:
 *   get:
 *     summary: Obtener historial de paciente
 *     tags: [Nurse]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Historial del paciente
 */
router.get('/patients/:patientId/history', getPatientHistory);

export default router;
