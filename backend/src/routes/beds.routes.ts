import { Router } from 'express';
import { BedsController } from '../controllers/beds.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdminOrSupervisor } from '../middleware/role.middleware';

const router = Router();
const bedsController = new BedsController();

router.get('/', authMiddleware, bedsController.getAll.bind(bedsController));
router.get('/area/:areaId', authMiddleware, bedsController.getByArea.bind(bedsController));
router.post('/', authMiddleware, requireAdminOrSupervisor, bedsController.create.bind(bedsController));
router.patch('/:id', authMiddleware, requireAdminOrSupervisor, bedsController.update.bind(bedsController));
router.post('/:id/assign', authMiddleware, requireAdminOrSupervisor, bedsController.assignPatient.bind(bedsController));
router.put('/:id/assign', authMiddleware, requireAdminOrSupervisor, bedsController.assignPatient.bind(bedsController));
router.delete('/:id', authMiddleware, requireAdminOrSupervisor, bedsController.delete.bind(bedsController));

export default router;

