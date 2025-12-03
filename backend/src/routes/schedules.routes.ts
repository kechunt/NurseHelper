import { Router } from 'express';
import { SchedulesController } from '../controllers/schedules.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdminOrSupervisor } from '../middleware/role.middleware';

const router = Router();
const schedulesController = new SchedulesController();

router.get('/', authMiddleware, schedulesController.getAll.bind(schedulesController));
router.get('/patient/:patientId', authMiddleware, schedulesController.getByPatient.bind(schedulesController));
router.post('/', authMiddleware, requireAdminOrSupervisor, schedulesController.create.bind(schedulesController));
router.patch('/:id', authMiddleware, requireAdminOrSupervisor, schedulesController.update.bind(schedulesController));
router.delete('/:id', authMiddleware, requireAdminOrSupervisor, schedulesController.delete.bind(schedulesController));

// Rutas específicas para enfermeras (gestión de tareas)
// Solo requieren autenticación, las enfermeras pueden gestionar sus propias tareas
router.put('/:id/complete', authMiddleware, schedulesController.complete.bind(schedulesController));
router.put('/:id/not-completed', authMiddleware, schedulesController.markAsNotCompleted.bind(schedulesController));
router.put('/:id/postpone', authMiddleware, schedulesController.postpone.bind(schedulesController));
router.put('/:id/medication-given', authMiddleware, schedulesController.markMedicationGiven.bind(schedulesController));

export default router;

