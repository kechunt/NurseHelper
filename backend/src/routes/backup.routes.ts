import { Router } from 'express';
import { backupController } from '../controllers/backup.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { UserRole } from '../entities/User';

const router = Router();

// Solo administradores pueden gestionar backups
router.use(authMiddleware);
router.use(roleMiddleware([UserRole.ADMIN]));

router.post('/', backupController.createBackup);
router.get('/', backupController.listBackups);
router.post('/restore', backupController.restoreBackup);
router.get('/verify', backupController.verifyBackup);
router.post('/test-restore', backupController.testRestore);

export default router;
