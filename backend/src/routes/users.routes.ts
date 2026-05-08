import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin, requireAdminOrSupervisor, requireAdminSupervisorOrNurseOwnAreaParam } from '../middleware/role.middleware';

const router = Router();
const usersController = new UsersController();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtener todos los usuarios con paginación y filtros
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Límite de resultados por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Búsqueda por nombre, email o username
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, nurse, supervisor, pharmacy]
 *         description: Filtrar por rol
 *     responses:
 *       200:
 *         description: Lista de usuarios con paginación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */
router.get(
  '/area/:areaId/nurses',
  authMiddleware,
  requireAdminSupervisorOrNurseOwnAreaParam,
  usersController.getNursesByArea.bind(usersController)
);

router.get('/', authMiddleware, requireAdminOrSupervisor, usersController.getAll.bind(usersController));

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Actualizar información de usuario
 *     tags: [Users]
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
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, nurse, supervisor, pharmacy]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 */
router.patch('/:id', authMiddleware, requireAdminOrSupervisor, usersController.update.bind(usersController));

/**
 * @swagger
 * /api/users/{id}/role:
 *   patch:
 *     summary: Actualizar rol de usuario
 *     tags: [Users]
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, nurse, supervisor, pharmacy]
 *     responses:
 *       200:
 *         description: Rol actualizado exitosamente
 */
router.patch('/:id/role', authMiddleware, requireAdminOrSupervisor, usersController.updateRole.bind(usersController));

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Eliminar usuario (soft delete)
 *     tags: [Users]
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
 *         description: Usuario desactivado exitosamente
 */
router.delete('/:id', authMiddleware, requireAdminOrSupervisor, usersController.delete.bind(usersController));

/**
 * @swagger
 * /api/users/{id}/restore:
 *   patch:
 *     summary: Restaurar usuario inactivo
 *     tags: [Users]
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
 *         description: Usuario restaurado exitosamente
 */
router.patch('/:id/restore', authMiddleware, requireAdminOrSupervisor, usersController.restore.bind(usersController));

export default router;

