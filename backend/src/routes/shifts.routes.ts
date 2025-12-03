import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdminOrSupervisor } from '../middleware/role.middleware';
import { getShifts, updateShift, getWeeklySchedule, saveWeeklySchedule } from '../controllers/shifts.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireAdminOrSupervisor);

router.get('/', getShifts);
router.put('/:id', updateShift);
router.get('/weekly', getWeeklySchedule);
router.post('/weekly', saveWeeklySchedule);

export default router;

