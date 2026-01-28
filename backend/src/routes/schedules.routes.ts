import { Router } from 'express';
import { SchedulesController } from '../controllers/schedules.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdminOrSupervisor } from '../middleware/role.middleware';

const router = Router();
const schedulesController = new SchedulesController();

/**
 * @swagger
 * /api/schedules:
 *   get:
 *     summary: Obtener todos los horarios/tareas
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de horarios
 */
router.get('/', authMiddleware, schedulesController.getAll.bind(schedulesController));

/**
 * @swagger
 * /api/schedules/patient/{patientId}:
 *   get:
 *     summary: Obtener horarios por paciente
 *     tags: [Schedules]
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
 *         description: Lista de horarios del paciente
 */
router.get('/patient/:patientId', authMiddleware, schedulesController.getByPatient.bind(schedulesController));

/**
 * @swagger
 * /api/schedules:
 *   post:
 *     summary: Crear nuevo horario/tarea
 *     tags: [Schedules]
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
 *               - type
 *               - scheduledTime
 *             properties:
 *               patientId:
 *                 type: integer
 *               assignedToId:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [medication, check, treatment, other]
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *               description:
 *                 type: string
 *               medication:
 *                 type: string
 *               dosage:
 *                 type: string
 *     responses:
 *       201:
 *         description: Horario creado exitosamente
 */
router.post('/', authMiddleware, requireAdminOrSupervisor, schedulesController.create.bind(schedulesController));

/**
 * @swagger
 * /api/schedules/{id}:
 *   patch:
 *     summary: Actualizar horario/tarea
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [pending, completed, missed, cancelled]
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Horario actualizado exitosamente
 */
router.patch('/:id', authMiddleware, requireAdminOrSupervisor, schedulesController.update.bind(schedulesController));

/**
 * @swagger
 * /api/schedules/{id}:
 *   delete:
 *     summary: Eliminar horario/tarea
 *     tags: [Schedules]
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
 *         description: Horario eliminado exitosamente
 */
router.delete('/:id', authMiddleware, requireAdminOrSupervisor, schedulesController.delete.bind(schedulesController));

/**
 * @swagger
 * /api/schedules/{id}/complete:
 *   put:
 *     summary: Marcar tarea como completada
 *     tags: [Schedules]
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
 *         description: Tarea marcada como completada
 */
router.put('/:id/complete', authMiddleware, schedulesController.complete.bind(schedulesController));

/**
 * @swagger
 * /api/schedules/{id}/not-completed:
 *   put:
 *     summary: Marcar tarea como no completada
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Razón por la cual no se completó la tarea
 *     responses:
 *       200:
 *         description: Tarea marcada como no completada
 */
router.put('/:id/not-completed', authMiddleware, schedulesController.markAsNotCompleted.bind(schedulesController));

/**
 * @swagger
 * /api/schedules/{id}/postpone:
 *   put:
 *     summary: Posponer tarea
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newTime
 *             properties:
 *               newTime:
 *                 type: string
 *                 format: date-time
 *                 description: Nueva fecha y hora para la tarea
 *     responses:
 *       200:
 *         description: Tarea pospuesta exitosamente
 */
router.put('/:id/postpone', authMiddleware, schedulesController.postpone.bind(schedulesController));

/**
 * @swagger
 * /api/schedules/{id}/medication-given:
 *   put:
 *     summary: Registrar administración de medicamento
 *     tags: [Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Notas adicionales sobre la administración
 *     responses:
 *       200:
 *         description: Administración registrada exitosamente
 */
router.put('/:id/medication-given', authMiddleware, schedulesController.markMedicationGiven.bind(schedulesController));

export default router;
