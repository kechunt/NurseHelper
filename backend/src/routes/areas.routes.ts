import { Router } from 'express';
import { AreasController } from '../controllers/areas.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdminOrSupervisor } from '../middleware/role.middleware';

const router = Router();
const areasController = new AreasController();

/**
 * @swagger
 * /api/areas:
 *   get:
 *     summary: Obtener todas las áreas
 *     tags: [Areas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de áreas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Area'
 */
router.get('/', authMiddleware, areasController.getAll.bind(areasController));

/**
 * @swagger
 * /api/areas/{id}:
 *   get:
 *     summary: Obtener área por ID
 *     tags: [Areas]
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
 *         description: Información del área
 */
router.get('/:id', authMiddleware, areasController.getById.bind(areasController));

/**
 * @swagger
 * /api/areas:
 *   post:
 *     summary: Crear nueva área
 *     tags: [Areas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Área creada exitosamente
 */
router.post('/', authMiddleware, requireAdminOrSupervisor, areasController.create.bind(areasController));

/**
 * @swagger
 * /api/areas/{id}:
 *   patch:
 *     summary: Actualizar área
 *     tags: [Areas]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Área actualizada exitosamente
 */
router.patch('/:id', authMiddleware, requireAdminOrSupervisor, areasController.update.bind(areasController));

/**
 * @swagger
 * /api/areas/{id}:
 *   delete:
 *     summary: Eliminar área (soft delete)
 *     tags: [Areas]
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
 *         description: Área eliminada exitosamente
 */
router.delete('/:id', authMiddleware, requireAdminOrSupervisor, areasController.delete.bind(areasController));

export default router;
