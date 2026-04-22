import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check básico (montado en /health)
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Servicio OK
 */
router.get('/', healthController.basic);

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Estado detallado del servidor y dependencias
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Detalle
 *       503:
 *         description: Degradado
 */
router.get('/detailed', healthController.detailed);

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness (¿listo para recibir tráfico?)
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Listo
 *       503:
 *         description: No listo
 */
router.get('/ready', healthController.ready);

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness (proceso vivo)
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Vivo
 */
router.get('/live', healthController.live);

/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: Métricas básicas de solicitudes
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Contadores / métricas
 */
router.get('/metrics', healthController.metrics);

export default router;
