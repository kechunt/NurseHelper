import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateDto } from '../middleware/validation.middleware';
import { AddMedicationDto, SuspendMedicationDto, DeleteMedicationDto } from '../dto/medication.dto';
import {
  addMedication,
  suspendMedication,
  deleteMedication,
  reactivateMedication,
  getPatientMedications
} from '../controllers/medications.controller';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/medications/patient/{patientId}:
 *   get:
 *     summary: Obtener medicamentos de un paciente
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de medicamentos del paciente
 */
router.get('/patient/:patientId', getPatientMedications);

/**
 * @swagger
 * /api/medications:
 *   post:
 *     summary: Agregar medicamento a paciente
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - medication
 *               - dosage
 *               - frequency
 *             properties:
 *               patientId:
 *                 type: integer
 *               medication:
 *                 type: string
 *                 description: Nombre del medicamento
 *               medicationId:
 *                 type: integer
 *                 description: ID del medicamento (alternativa)
 *               dosage:
 *                 type: string
 *               frequency:
 *                 type: string
 *               times:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Horarios específicos de administración
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               days:
 *                 oneOf:
 *                   - type: array
 *                     items:
 *                       type: string
 *                   - type: string
 *                     enum: [all]
 *                 description: Días de la semana o 'all' para todos los días
 *               duration:
 *                 type: integer
 *               durationUnit:
 *                 type: string
 *                 enum: [days, weeks, months]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Medicamento agregado exitosamente
 */
router.post('/', validateDto(AddMedicationDto), addMedication);

/**
 * @swagger
 * /api/medications/patient/{patientId}/{medication}/suspend:
 *   put:
 *     summary: Suspender medicamento de paciente
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: medication
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del medicamento (codificado en URL)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Razón de la suspensión
 *               suspendUntil:
 *                 type: string
 *                 format: date
 *                 description: Fecha hasta la cual suspender (opcional)
 *     responses:
 *       200:
 *         description: Medicamento suspendido exitosamente
 */
router.put('/patient/:patientId/:medication/suspend', validateDto(SuspendMedicationDto), suspendMedication);

/**
 * @swagger
 * /api/medications/patient/{patientId}/{medication}/reactivate:
 *   put:
 *     summary: Reactivar medicamento de paciente
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: medication
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Medicamento reactivado exitosamente
 */
router.put('/patient/:patientId/:medication/reactivate', reactivateMedication);

/**
 * @swagger
 * /api/medications/patient/{patientId}/{medication}:
 *   delete:
 *     summary: Eliminar medicamento de paciente
 *     tags: [Medications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: medication
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del medicamento (codificado en URL)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Razón de la eliminación
 *     responses:
 *       200:
 *         description: Medicamento eliminado exitosamente
 */
router.delete('/patient/:patientId/:medication', validateDto(DeleteMedicationDto), deleteMedication);

export default router;
