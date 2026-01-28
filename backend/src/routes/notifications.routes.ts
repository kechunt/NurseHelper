import { Router } from 'express';
import { notificationsController } from '../controllers/notifications.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', notificationsController.getNotifications);
router.patch('/:id/read', notificationsController.markAsRead);
router.patch('/read-all', notificationsController.markAllAsRead);
router.delete('/:id', notificationsController.delete);

export default router;
