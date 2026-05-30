import { Router } from 'express';
import { PatientsController } from '../controllers/patients.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdminOrSupervisor } from '../middleware/role.middleware';
import { validateDto } from '../middleware/validation.middleware';
import { CreatePatientDto, UpdatePatientDto, SaveObservationDto } from '../dto/patient.dto';

const router = Router();
const patientsController = new PatientsController();

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Obtener todos los pacientes
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Límite de resultados
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Búsqueda por nombre o cédula
 *     responses:
 *       200:
 *         description: Lista de pacientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Patient'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
router.get('/', authMiddleware, patientsController.getAll.bind(patientsController));

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Obtener paciente por ID
 *     tags: [Patients]
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
 *         description: Información del paciente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 */
router.get('/:id', authMiddleware, patientsController.getById.bind(patientsController));

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Crear nuevo paciente
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               identificationNumber:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *               medicalHistory:
 *                 type: string
 *               allergies:
 *                 type: string
 *     responses:
 *       201:
 *         description: Paciente creado exitosamente
 */
router.post('/', authMiddleware, requireAdminOrSupervisor, validateDto(CreatePatientDto), patientsController.create.bind(patientsController));

/**
 * @swagger
 * /api/patients/{id}:
 *   patch:
 *     summary: Actualizar paciente
 *     tags: [Patients]
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
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               identificationNumber:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *               medicalHistory:
 *                 type: string
 *               allergies:
 *                 type: string
 *     responses:
 *       200:
 *         description: Paciente actualizado exitosamente
 */
// Permitir que enfermeras también actualicen pacientes (solo campos específicos)
router.patch('/:id', authMiddleware, validateDto(UpdatePatientDto), patientsController.update.bind(patientsController));

/**
 * @swagger
 * /api/patients/{id}:
 *   delete:
 *     summary: Eliminar paciente (soft delete)
 *     tags: [Patients]
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
 *         description: Paciente eliminado exitosamente
 */
router.delete('/:id', authMiddleware, requireAdminOrSupervisor, patientsController.delete.bind(patientsController));

/**
 * @swagger
 * /api/patients/{id}/observations:
 *   post:
 *     summary: Guardar observación médica del paciente
 *     tags: [Patients]
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
 *               - observation
 *             properties:
 *               observation:
 *                 type: string
 *               scope:
 *                 type: string
 *                 enum: [general, medical, diagnosis, allergies, specialNeeds]
 *                 description: Campo destino de la línea fechada (generalObservations, medicalObservations, medicalHistory, allergies, specialNeeds)
 *     responses:
 *       200:
 *         description: Observación guardada exitosamente
 */
router.post('/:id/observations', authMiddleware, validateDto(SaveObservationDto), patientsController.saveObservation.bind(patientsController));

export default router;
