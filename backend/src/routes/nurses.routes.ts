import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getNurseStats,
  getMyBeds,
  getMyPatients,
  getTodayTasks,
  getMedicationsForPharmacy,
  getPatientDetails,
  addTreatment,
  recordAdministration,
  getPatientHistory
} from '../controllers/nurses.controller';

const router = Router();

router.use(authMiddleware);

router.get('/stats', getNurseStats);
router.get('/beds', getMyBeds);
router.get('/patients', getMyPatients);
router.get('/patients/:id', getPatientDetails);
router.get('/tasks/today', getTodayTasks);
router.get('/medications/pharmacy', getMedicationsForPharmacy);
router.post('/treatments', addTreatment);
router.post('/administration', recordAdministration);
router.get('/patients/:patientId/history', getPatientHistory);

export default router;

