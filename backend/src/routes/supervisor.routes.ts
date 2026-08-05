import { Router } from 'express';
import { supervisorController } from '../controllers/supervisor.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireSupervisor } from '../middleware/role.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireSupervisor);

/**
 * @swagger
 * /api/supervisor/platform:
 *   get:
 *     summary: Metadatos de plataforma (solo supervisor)
 *     tags: [Supervisor]
 *     security:
 *       - bearerAuth: []
 */
router.get('/platform', supervisorController.getPlatformInfo);

/**
 * @swagger
 * /api/supervisor/audit-recent:
 *   get:
 *     summary: Eventos de auditoría recientes en memoria (solo supervisor)
 *     tags: [Supervisor]
 *     security:
 *       - bearerAuth: []
 */
router.get('/audit-recent', supervisorController.getRecentAudit);

export default router;
