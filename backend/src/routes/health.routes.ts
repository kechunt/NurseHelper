import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

// Health checks públicos (no requieren autenticación)
router.get('/', healthController.basic);
router.get('/detailed', healthController.detailed);
router.get('/ready', healthController.ready);
router.get('/live', healthController.live);
router.get('/metrics', healthController.metrics);

export default router;
