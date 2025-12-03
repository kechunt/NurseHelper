import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  addMedication,
  suspendMedication,
  deleteMedication,
  reactivateMedication,
  getPatientMedications
} from '../controllers/medications.controller';

const router = Router();

router.use(authMiddleware);

router.get('/patient/:patientId', getPatientMedications);
router.post('/', addMedication);
router.put('/patient/:patientId/:medication/suspend', suspendMedication);
router.put('/patient/:patientId/:medication/reactivate', reactivateMedication);
router.delete('/patient/:patientId/:medication', deleteMedication);

export default router;

