import { Router } from 'express';
import { backupController } from '../controllers/backup.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { UserRole } from '../entities/User';

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware([UserRole.ADMIN]));

/**
 * @swagger
 * /api/backup:
 *   post:
 *     summary: Crear backup (solo admin)
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [full, incremental]
 *                 default: full
 *     responses:
 *       200:
 *         description: Backup creado
 *       403:
 *         description: Sin permisos
 */
router.post('/', backupController.createBackup);

/**
 * @swagger
 * /api/backup:
 *   get:
 *     summary: Listar backups disponibles (solo admin)
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de archivos de backup
 */
router.get('/', backupController.listBackups);

/**
 * @swagger
 * /api/backup/restore:
 *   post:
 *     summary: Restaurar desde un archivo de backup (solo admin)
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *             properties:
 *               filename:
 *                 type: string
 *     responses:
 *       200:
 *         description: Restauración iniciada o completada
 *       400:
 *         description: filename requerido
 */
router.post('/restore', backupController.restoreBackup);

/**
 * @swagger
 * /api/backup/verify:
 *   get:
 *     summary: Verificar integridad de un backup (solo admin)
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resultado de verificación
 */
router.get('/verify', backupController.verifyBackup);

/**
 * @swagger
 * /api/backup/test-restore:
 *   post:
 *     summary: Probar restauración sin aplicar cambios definitivos (solo admin)
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *             properties:
 *               filename:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resultado de prueba
 */
router.post('/test-restore', backupController.testRestore);

export default router;
