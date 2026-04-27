import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdminOrSupervisor } from '../middleware/role.middleware';
import {
  getShifts,
  updateShift,
  getWeeklySchedule,
  saveWeeklySchedule,
  getShiftAttendance,
  saveShiftAttendance,
  getPresentNursesByShift,
  getShiftAttendanceHistory,
} from '../controllers/shifts.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireAdminOrSupervisor);

/**
 * @swagger
 * /api/shifts:
 *   get:
 *     summary: Obtener todos los turnos
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de turnos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Shift'
 */
router.get('/', getShifts);

/**
 * @swagger
 * /api/shifts/{id}:
 *   put:
 *     summary: Actualizar turno
 *     tags: [Shifts]
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
 *               startTime:
 *                 type: string
 *                 format: time
 *               endTime:
 *                 type: string
 *                 format: time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Turno actualizado exitosamente
 */
router.put('/:id', updateShift);

/**
 * @swagger
 * /api/shifts/weekly:
 *   get:
 *     summary: Obtener horario semanal de turnos
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weekStart
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio de la semana (lunes)
 *       - in: query
 *         name: weekStartDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio de la semana (alternativa)
 *     responses:
 *       200:
 *         description: Horario semanal
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   nurseId:
 *                     type: integer
 *                   nurseName:
 *                     type: string
 *                   monday:
 *                     type: string
 *                   tuesday:
 *                     type: string
 *                   wednesday:
 *                     type: string
 *                   thursday:
 *                     type: string
 *                   friday:
 *                     type: string
 *                   saturday:
 *                     type: string
 *                   sunday:
 *                     type: string
 */
router.get('/weekly', getWeeklySchedule);

/**
 * @swagger
 * /api/shifts/weekly:
 *   post:
 *     summary: Guardar horario semanal de turnos
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - schedules
 *             properties:
 *               weekStart:
 *                 type: string
 *                 format: date
 *                 description: Fecha de inicio de la semana (lunes)
 *               weekStartDate:
 *                 type: string
 *                 format: date
 *                 description: Fecha de inicio de la semana (alternativa)
 *               schedules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     nurseId:
 *                       type: integer
 *                     day:
 *                       type: string
 *                       enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                     shiftType:
 *                       type: string
 *                       enum: [morning, afternoon, night, off]
 *     responses:
 *       200:
 *         description: Horario semanal guardado exitosamente
 */
router.post('/weekly', saveWeeklySchedule);
router.get('/attendance', getShiftAttendance);
router.post('/attendance', saveShiftAttendance);
router.get('/attendance/present', getPresentNursesByShift);
router.get('/attendance/history', getShiftAttendanceHistory);

export default router;
