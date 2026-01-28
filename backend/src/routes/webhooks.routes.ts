import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { UserRole } from '../entities/User';

const router = Router();

/**
 * Rutas de webhooks
 * Requieren autenticación y rol de admin
 */
router.use(authMiddleware);
router.use(roleMiddleware([UserRole.ADMIN]));

router.post('/register', webhookController.register);
router.get('/', webhookController.list);
router.delete('/:id', webhookController.delete);
router.post('/test/:id', webhookController.test);

export default router;
