import { Router } from 'express';
import { AreasController } from '../controllers/areas.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdminOrSupervisor } from '../middleware/role.middleware';

const router = Router();
const areasController = new AreasController();

router.get('/', authMiddleware, areasController.getAll.bind(areasController));
router.get('/:id', authMiddleware, areasController.getById.bind(areasController));
router.post('/', authMiddleware, requireAdminOrSupervisor, areasController.create.bind(areasController));
router.patch('/:id', authMiddleware, requireAdminOrSupervisor, areasController.update.bind(areasController));
router.delete('/:id', authMiddleware, requireAdminOrSupervisor, areasController.delete.bind(areasController));

export default router;

