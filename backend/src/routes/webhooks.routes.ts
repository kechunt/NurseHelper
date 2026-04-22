import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { UserRole } from '../entities/User';

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware([UserRole.ADMIN]));

/**
 * @swagger
 * /api/webhooks/register:
 *   post:
 *     summary: Registrar webhook (solo admin)
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - events
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               secret:
 *                 type: string
 *     responses:
 *       201:
 *         description: Webhook creado
 *       400:
 *         description: Datos inválidos
 */
router.post('/register', webhookController.register);

/**
 * @swagger
 * /api/webhooks:
 *   get:
 *     summary: Listar webhooks del usuario (solo admin)
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de webhooks
 */
router.get('/', webhookController.list);

/**
 * @swagger
 * /api/webhooks/{id}:
 *   delete:
 *     summary: Eliminar webhook (solo admin)
 *     tags: [Webhooks]
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
 *         description: Eliminado
 */
router.delete('/:id', webhookController.delete);

/**
 * @swagger
 * /api/webhooks/test/{id}:
 *   post:
 *     summary: Enviar evento de prueba al webhook (solo admin)
 *     tags: [Webhooks]
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
 *         description: Resultado de la prueba
 */
router.post('/test/:id', webhookController.test);

export default router;
