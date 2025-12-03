import { Router } from 'express';
import { PatientsController } from '../controllers/patients.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdminOrSupervisor } from '../middleware/role.middleware';

const router = Router();
const patientsController = new PatientsController();

router.get('/', authMiddleware, patientsController.getAll.bind(patientsController));
router.get('/:id', authMiddleware, patientsController.getById.bind(patientsController));
router.post('/', authMiddleware, requireAdminOrSupervisor, patientsController.create.bind(patientsController));
router.patch('/:id', authMiddleware, requireAdminOrSupervisor, patientsController.update.bind(patientsController));
router.delete('/:id', authMiddleware, requireAdminOrSupervisor, patientsController.delete.bind(patientsController));
router.post('/:id/observations', authMiddleware, patientsController.saveObservation.bind(patientsController));

export default router;

