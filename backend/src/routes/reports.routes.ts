import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

const router = Router();

router.use(authMiddleware);
router.use(rateLimitMiddleware(60 * 1000, 20)); // 20 requests por minuto para reportes

/**
 * @swagger
 * /api/reports/medications:
 *   get:
 *     summary: Reporte de medicamentos por periodo
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reporte generado
 *       400:
 *         description: Faltan fechas
 */
router.get('/medications', reportsController.generateMedicationReport);

/**
 * @swagger
 * /api/reports/compliance:
 *   get:
 *     summary: Estadísticas de cumplimiento (tareas / medicación)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estadísticas
 *       400:
 *         description: Parámetros inválidos
 */
router.get('/compliance', reportsController.generateComplianceStats);

/**
 * @swagger
 * /api/reports/export:
 *   get:
 *     summary: Exportar reporte (tipo y formato)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [medication, compliance]
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pdf, csv]
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Archivo o JSON exportado
 *       400:
 *         description: Parámetros incompletos
 */
router.get('/export', reportsController.exportReport);

export default router;
