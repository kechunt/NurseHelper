import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdminOrSupervisor } from '../middleware/role.middleware';
import { getAdminHandoverNote, putAdminHandoverNote } from '../controllers/handover.controller';

const router = Router();

router.get('/admin-notes', authMiddleware, requireAdminOrSupervisor, getAdminHandoverNote);
router.put('/admin-notes', authMiddleware, requireAdminOrSupervisor, putAdminHandoverNote);

export default router;
