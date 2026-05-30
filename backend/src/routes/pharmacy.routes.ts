import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  requireAdminOrSupervisorOrPharmacy,
  requireNurseOrAdminOrSupervisorOrPharmacy,
} from '../middleware/role.middleware';
import {
  getPharmacyWorkShifts,
  getPharmacyShiftAttendanceSummary,
  getPharmacyShiftAttendance,
  postPharmacyShiftAttendance,
} from '../controllers/pharmacy-shift-attendance.controller';
import { 
  getMedicationRequests, 
  updateRequestStatus, 
  deliverMedication,
  getDeliveryHistory,
  getInventory,
  getInventoryMovements,
  postInventoryMovement,
  updateMedicationStock,
  createMedicationRequest,
  createMedication,
  deleteMedication
} from '../controllers/pharmacy.controller';

const router = Router();

router.use(authMiddleware);

router.get('/work-shifts', requireAdminOrSupervisorOrPharmacy, getPharmacyWorkShifts);
router.get('/shift-attendance/summary', requireAdminOrSupervisorOrPharmacy, getPharmacyShiftAttendanceSummary);
router.get('/shift-attendance', requireAdminOrSupervisorOrPharmacy, getPharmacyShiftAttendance);
router.post('/shift-attendance', requireAdminOrSupervisorOrPharmacy, postPharmacyShiftAttendance);

/**
 * @swagger
 * /api/pharmacy/requests:
 *   get:
 *     summary: Obtener solicitudes de medicamentos
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_preparation, ready, delivered, cancelled]
 *         description: Filtrar por estado
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MedicationRequest'
 */
router.get('/requests', requireAdminOrSupervisorOrPharmacy, getMedicationRequests);

/**
 * @swagger
 * /api/pharmacy/requests:
 *   post:
 *     summary: Crear solicitud de medicamento
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - medicationId
 *               - quantity
 *             properties:
 *               medicationId:
 *                 type: integer
 *               medicationName:
 *                 type: string
 *                 description: Nombre del medicamento (alternativa a medicationId)
 *               quantity:
 *                 type: integer
 *               dosage:
 *                 type: string
 *               patientsInfo:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Información de los pacientes que necesitan el medicamento
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 default: normal
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Solicitud creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicationRequest'
 */
router.post('/requests', requireNurseOrAdminOrSupervisorOrPharmacy, createMedicationRequest);

/**
 * @swagger
 * /api/pharmacy/requests/{id}/status:
 *   put:
 *     summary: Actualizar estado de solicitud
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_preparation, ready, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 */
router.put('/requests/:id/status', requireAdminOrSupervisorOrPharmacy, updateRequestStatus);

/**
 * @swagger
 * /api/pharmacy/requests/{requestId}/deliver:
 *   post:
 *     summary: Entregar medicamento
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Medicamento entregado exitosamente
 */
router.post('/requests/:requestId/deliver', requireAdminOrSupervisorOrPharmacy, deliverMedication);

/**
 * @swagger
 * /api/pharmacy/deliveries:
 *   get:
 *     summary: Obtener historial de entregas
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio para filtrar entregas
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin para filtrar entregas
 *     responses:
 *       200:
 *         description: Historial de entregas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   deliveryId:
 *                     type: string
 *                   medication:
 *                     type: object
 *                   dosage:
 *                     type: string
 *                   quantity:
 *                     type: integer
 *                   requestedBy:
 *                     type: object
 *                   deliveredBy:
 *                     type: object
 *                   patients:
 *                     type: array
 *                     items:
 *                       type: string
 *                   notes:
 *                     type: string
 *                   deliveredAt:
 *                     type: string
 *                     format: date-time
 */
router.get('/deliveries', requireAdminOrSupervisorOrPharmacy, getDeliveryHistory);

/**
 * @swagger
 * /api/pharmacy/inventory:
 *   get:
 *     summary: Obtener inventario de medicamentos
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventario de medicamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   dosage:
 *                     type: string
 *                   description:
 *                     type: string
 *                   stock:
 *                     type: integer
 *                   minStock:
 *                     type: integer
 *                   location:
 *                     type: string
 *                   expiryDate:
 *                     type: string
 *                     format: date
 *                   status:
 *                     type: string
 *                     enum: [available, low_stock, out_of_stock, expired]
 */
router.get('/inventory', requireAdminOrSupervisorOrPharmacy, getInventory);

/**
 * @swagger
 * /api/pharmacy/inventory/movements:
 *   get:
 *     summary: Kardex / historial de movimientos de un medicamento
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: medicationId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Lista de movimientos
 */
router.get('/inventory/movements', requireAdminOrSupervisorOrPharmacy, getInventoryMovements);

/**
 * @swagger
 * /api/pharmacy/inventory/{id}/movements:
 *   post:
 *     summary: Registrar movimiento de inventario (entrada, salida o ajuste)
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 */
router.post('/inventory/:id/movements', requireAdminOrSupervisorOrPharmacy, postInventoryMovement);

/**
 * @swagger
 * /api/pharmacy/inventory/{id}/stock:
 *   put:
 *     summary: Actualizar stock de medicamento
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stock
 *             properties:
 *               stock:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Stock actualizado exitosamente
 */
router.put('/inventory/:id/stock', requireAdminOrSupervisorOrPharmacy, updateMedicationStock);

/**
 * @swagger
 * /api/pharmacy/inventory:
 *   post:
 *     summary: Crear nuevo medicamento en inventario
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - dosage
 *             properties:
 *               name:
 *                 type: string
 *               dosage:
 *                 type: string
 *               description:
 *                 type: string
 *               stock:
 *                 type: integer
 *               minStock:
 *                 type: integer
 *               location:
 *                 type: string
 *               expiryDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Medicamento creado exitosamente
 */
router.post('/inventory', requireAdminOrSupervisorOrPharmacy, createMedication);

/**
 * @swagger
 * /api/pharmacy/inventory/{id}:
 *   delete:
 *     summary: Eliminar medicamento del inventario
 *     tags: [Pharmacy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Medicamento eliminado exitosamente
 */
router.delete('/inventory/:id', requireAdminOrSupervisorOrPharmacy, deleteMedication);

export default router;
