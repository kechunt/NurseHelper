import { Router } from 'express';
import { BedsController } from '../controllers/beds.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdminOrSupervisor, requireAdminOrSupervisorOrNurseInArea } from '../middleware/role.middleware';

const router = Router();
const bedsController = new BedsController();

/**
 * @swagger
 * /api/beds:
 *   get:
 *     summary: Obtener todas las camas
 *     tags: [Beds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Incluir camas inactivas
 *     responses:
 *       200:
 *         description: Lista de camas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Bed'
 */
router.get('/', authMiddleware, bedsController.getAll.bind(bedsController));

/**
 * @swagger
 * /api/beds/area/{areaId}:
 *   get:
 *     summary: Obtener camas por área
 *     tags: [Beds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: areaId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de camas del área
 */
router.get('/area/:areaId', authMiddleware, bedsController.getByArea.bind(bedsController));

/**
 * @swagger
 * /api/beds:
 *   post:
 *     summary: Crear nueva cama
 *     tags: [Beds]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bedNumber
 *               - areaId
 *             properties:
 *               bedNumber:
 *                 type: string
 *               areaId:
 *                 type: integer
 *               notes:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Cama creada exitosamente
 */
router.post('/', authMiddleware, requireAdminOrSupervisor, bedsController.create.bind(bedsController));

/**
 * @swagger
 * /api/beds/{id}:
 *   patch:
 *     summary: Actualizar cama
 *     tags: [Beds]
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
 *               bedNumber:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cama actualizada exitosamente
 */
router.patch('/:id', authMiddleware, requireAdminOrSupervisorOrNurseInArea, bedsController.update.bind(bedsController));

/**
 * @swagger
 * /api/beds/{id}/assign:
 *   post:
 *     summary: Asignar paciente a cama
 *     tags: [Beds]
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
 *               patientId:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Paciente asignado exitosamente
 */
router.post('/:id/assign', authMiddleware, requireAdminOrSupervisor, bedsController.assignPatient.bind(bedsController));

/**
 * @swagger
 * /api/beds/{id}:
 *   delete:
 *     summary: Eliminar cama
 *     tags: [Beds]
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
 *         description: Cama eliminada exitosamente
 */
router.delete('/:id', authMiddleware, requireAdminOrSupervisor, bedsController.delete.bind(bedsController));

export default router;
