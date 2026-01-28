import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();

router.use(authMiddleware);
router.use(rateLimitMiddleware(60 * 1000, 20)); // 20 requests por minuto para reportes

router.get('/medications', reportsController.generateMedicationReport);
router.get('/compliance', reportsController.generateComplianceStats);
router.get('/export', reportsController.exportReport);

export default router;
