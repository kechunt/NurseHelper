import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { loadEnv } from './utils/env';
import { logger } from './utils/logger';
import { AppDataSource } from './data-source';
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
import diagnosticRoutes from './routes/diagnostic.routes';
import healthRoutes from './routes/health.routes';

// Cargar variables de entorno al inicio
loadEnv();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middlewares de seguridad
app.use(helmet());

// Configuración de CORS mejorada para producción
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Obtener orígenes permitidos desde variables de entorno
    const allowedOriginsEnv: string[] = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : [];

    // Orígenes permitidos por defecto
    const defaultOrigins: string[] = ['http://localhost:4200'];
    const allAllowedOrigins: string[] = [...defaultOrigins, ...allowedOriginsEnv];

    const vercelPattern = /^https:\/\/.*\.vercel\.app$/;

    const isAllowed =
      allAllowedOrigins.includes(origin) ||
      (process.env.NODE_ENV === 'production' && vercelPattern.test(origin));

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`⚠️ CORS bloqueado para origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitización de inputs (debe ir después de body parsers)
app.use(sanitizeMiddleware);

// Middleware de métricas (debe ir antes de las rutas)
app.use(metricsMiddleware);

// Rate limiting general
app.use(rateLimitMiddleware());

// Swagger Documentation
logger.info('🔄 Configurando Swagger...');
setupSwagger(app);
logger.info('✅ Swagger configurado');

// Rutas
logger.info('🔄 Registrando rutas...');
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
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/health', healthRoutes);
logger.info('✅ Rutas registradas');

/**
 * @swagger
 * /:
 *   get:
 *     summary: Información básica de la API
 *     tags: [Root]
 *     security: []
 *     responses:
 *       200:
 *         description: Metadatos y enlaces útiles
 */
/**
 * @swagger
 * /health-basic:
 *   get:
 *     summary: Health check mínimo (sin prefijo /health)
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Servidor en ejecución
 */
// Health check básico (mantener para compatibilidad)
app.get('/health-basic', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'NurseHelper API funcionando',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Raíz
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

// Middleware de manejo de errores (debe ir al final, después de todas las rutas)
app.use(errorHandler);

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Autenticación y registro
 *   - name: Users
 *     description: Gestión de usuarios
 *   - name: Areas
 *     description: Gestión de áreas hospitalarias
 *   - name: Beds
 *     description: Gestión de camas
 *   - name: Patients
 *     description: Gestión de pacientes
 *   - name: Schedules
 *     description: Horarios y tareas
 *   - name: Nurse
 *     description: Funciones de enfermeras
 *   - name: Medications
 *     description: Gestión de medicamentos
 *   - name: Shifts
 *     description: Turnos de trabajo
 *   - name: Pharmacy
 *     description: Gestión de farmacia
 *   - name: Health
 *     description: Estado del servidor
 */

// Inicializar base de datos y servidor
logger.info('🔄 Iniciando conexión a la base de datos...');
AppDataSource.initialize()
  .then(() => {
    logger.info('✅ Base de datos conectada exitosamente');
    logger.info(`📊 Base de datos: ${process.env.DB_DATABASE || 'nursehelper'}`);
    logger.info(`🖥️  Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);
    
    logger.info('🔄 Iniciando servidor HTTP...');
    // Escuchar en todas las interfaces (0.0.0.0) para permitir conexiones locales y remotas
    const server = app.listen(PORT, '0.0.0.0', () => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      const backendUrl = `http://localhost:${PORT}`;
      const address = server.address();
      const actualAddress = address && typeof address === 'object' 
        ? `${address.address}:${address.port}` 
        : `0.0.0.0:${PORT}`;
      
      logger.info(`🚀 Backend: ${backendUrl}`);
      logger.info(`🌐 Frontend: ${frontendUrl}`);
      logger.info(`📚 Swagger: ${backendUrl}/api-docs`);
      logger.info(`🔌 Escuchando en: ${actualAddress}`);
      logger.info(`✅ Servidor iniciado correctamente y listo para recibir conexiones`);
      logger.info(`\n💡 Para verificar: curl http://localhost:${PORT}/health\n`);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ El puerto ${PORT} ya está en uso.`);
        if (process.env.NODE_ENV !== 'production') {
          logger.error(`💡 En desarrollo puedes liberar el puerto: lsof -ti:${PORT} | xargs kill -9`);
        }
        logger.error(`💡 O define otro puerto en el entorno, por ejemplo: PORT=3001`);
      } else if (error.code === 'EACCES') {
        logger.error(`❌ No tienes permisos para usar el puerto ${PORT}`);
        logger.error(`💡 Intenta usar un puerto mayor a 1024 o ejecuta con sudo`);
      } else {
        logger.error('❌ Error al iniciar el servidor:', error);
        logger.error(`   Código: ${error.code}`);
        logger.error(`   Mensaje: ${error.message}`);
      }
      process.exit(1);
    });

    // Verificar que el servidor está escuchando
    server.on('listening', () => {
      const address = server.address();
      if (address) {
        const addr = typeof address === 'string' ? address : `${address.address}:${address.port}`;
        logger.info(`🔌 Servidor escuchando en: ${addr}`);
      }
    });
  })
  .catch((error) => {
    logger.error('❌ Error al conectar la base de datos:', error);
    
    // Manejo específico de errores comunes
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      logger.error('💡 Verifica las credenciales en las variables de entorno');
      logger.error('   Variables a verificar: DB_USERNAME, DB_PASSWORD');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      logger.error('💡 ERROR: La base de datos especificada no existe');
      logger.error(`   Base de datos intentada: ${process.env.DB_DATABASE || 'nursehelper'}`);
      logger.error('');
      logger.error('🔧 SOLUCIÓN:');
      logger.error('   1. Verifica que la variable DB_DATABASE en Railway esté correcta');
      logger.error('   2. Asegúrate de que el nombre de la BD coincida exactamente');
      logger.error('   3. Si usas Railway, verifica que la BD esté creada y activa');
      logger.error('');
      if (process.env.DB_DATABASE?.toLowerCase().includes('raikway')) {
        logger.error('⚠️  DETECTADO: El nombre contiene "raikway" (error de tipeo)');
        logger.error('   Debe ser "railway" (con "l" después de "rai")');
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      logger.error('💡 ERROR: No se puede conectar al servidor de base de datos');
      logger.error(`   Host intentado: ${process.env.DB_HOST || 'localhost'}`);
      logger.error(`   Puerto intentado: ${process.env.DB_PORT || '3306'}`);
      logger.error('');
      logger.error('🔧 POSIBLES SOLUCIONES:');
      logger.error('   1. Verifica que el servidor de base de datos esté corriendo');
      logger.error('   2. Verifica las variables DB_HOST y DB_PORT en tu archivo .env');
      logger.error('   3. Si usas Railway, verifica que el servicio esté activo');
      logger.error('   4. Para desarrollo local, asegúrate de que MySQL esté corriendo:');
      logger.error('      brew services start mysql');
      logger.error('   5. Puedes aumentar el timeout con: DB_CONNECT_TIMEOUT=60000');
      logger.error('');
      if (process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') && !process.env.DB_HOST.includes('127.0.0.1')) {
        logger.error('⚠️  Estás intentando conectarte a un servidor remoto.');
        logger.error('   Para desarrollo local, considera usar:');
        logger.error('   DB_HOST=localhost');
        logger.error('   DB_PORT=3306');
        logger.error('   DB_DATABASE=nursehelper');
      }
    }
    
    process.exit(1);
  });

export default app;

