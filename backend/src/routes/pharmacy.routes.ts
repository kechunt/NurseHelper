import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { 
  getMedicationRequests, 
  updateRequestStatus, 
  deliverMedication,
  getDeliveryHistory,
  getInventory,
  updateMedicationStock,
  createMedicationRequest
} from '../controllers/pharmacy.controller';

const router = Router();

router.use(authMiddleware);

router.get('/requests', getMedicationRequests);
router.put('/requests/:id/status', updateRequestStatus);
router.post('/requests/:requestId/deliver', deliverMedication);
router.get('/deliveries', getDeliveryHistory);
router.get('/inventory', getInventory);
router.put('/inventory/:id/stock', updateMedicationStock);
router.post('/requests', createMedicationRequest);

export default router;

