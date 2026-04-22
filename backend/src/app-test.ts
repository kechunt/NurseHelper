/**
 * App export para tests
 * Exporta la app sin inicializar el servidor
 */

import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { loadEnv } from './utils/env';
import { setupSwagger } from './config/swagger';
import { errorHandler } from './utils/error-handler';
import { sanitizeMiddleware } from './utils/sanitizer';
import { rateLimitMiddleware, authRateLimitMiddleware } from './middleware/rate-limit.middleware';
import { metricsMiddleware } from './middleware/metrics.middleware';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import areasRoutes from './routes/areas.routes';
import bedsRoutes from './routes/beds.routes';
import patientsRoutes from './routes/patients.routes';
import schedulesRoutes from './routes/schedules.routes';
import nursesRoutes from './routes/nurses.routes';
import medicationsRoutes from './routes/medications.routes';
import shiftsRoutes from './routes/shifts.routes';
import pharmacyRoutes from './routes/pharmacy.routes';
import reportsRoutes from './routes/reports.routes';
import webhooksRoutes from './routes/webhooks.routes';
import notificationsRoutes from './routes/notifications.routes';
import backupRoutes from './routes/backup.routes';
import healthRoutes from './routes/health.routes';

// Cargar variables de entorno
loadEnv();

const app = express();

// Middlewares de seguridad
app.use(helmet());

// Configuración de CORS
const corsOptions: cors.CorsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitización de inputs
app.use(sanitizeMiddleware);

// Middleware de métricas
app.use(metricsMiddleware);

// Rate limiting general
app.use(rateLimitMiddleware());

// Swagger Documentation
setupSwagger(app);

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/beds', bedsRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/nurse', nursesRoutes);
app.use('/api/medications', medicationsRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/health', healthRoutes);

// Health check básico (mantener para compatibilidad)
app.get('/health-basic', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'NurseHelper API funcionando',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'NurseHelper Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      apiDocs: '/api-docs',
      auth: '/api/auth',
      users: '/api/users'
    }
  });
});

// Middleware de manejo de errores
app.use(errorHandler);

export default app;
