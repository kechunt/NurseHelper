import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getNurseStats,
  getMyBeds,
  getMyPatients,
  getTodayTasks,
  getMedicationsForPharmacy,
  getPatientDetails,
  addTreatment,
  recordAdministration,
  getPatientHistory
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
