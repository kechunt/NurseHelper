import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { loadEnv } from './utils/env';
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

    // Patrón regex para dominios de Vercel (acepta cualquier subdominio de vercel.app)
    const vercelPattern = /^https:\/\/.*\.vercel\.app$/;
    
    // Patrón para dominios personalizados de Vercel
    const vercelCustomPattern = /^https:\/\/.*\.vercel\.app$/;

    // Verificar si el origin está permitido
    const isAllowed = 
      allAllowedOrigins.includes(origin) || 
      (process.env.NODE_ENV === 'production' && (vercelPattern.test(origin) || vercelCustomPattern.test(origin)));

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS bloqueado para origin: ${origin}`);
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
console.log('🔄 Configurando Swagger...');
setupSwagger(app);
console.log('✅ Swagger configurado');

// Rutas
console.log('🔄 Registrando rutas...');
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
app.use('/api/reports', require('./routes/reports.routes').default);
app.use('/api/webhooks', require('./routes/webhooks.routes').default);
app.use('/api/notifications', require('./routes/notifications.routes').default);
app.use('/api/backup', require('./routes/backup.routes').default);
app.use('/api/diagnostic', require('./routes/diagnostic.routes').default);
app.use('/health', require('./routes/health.routes').default);
console.log('✅ Rutas registradas');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verificar estado del servidor
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
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

// Root endpoint para verificar que el servidor está funcionando
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
console.log('🔄 Iniciando conexión a la base de datos...');
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Base de datos conectada exitosamente');
    console.log(`📊 Base de datos: ${process.env.DB_DATABASE || 'nursehelper'}`);
    console.log(`🖥️  Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);
    
    console.log('🔄 Iniciando servidor HTTP...');
    // Escuchar en todas las interfaces (0.0.0.0) para permitir conexiones locales y remotas
    const server = app.listen(PORT, '0.0.0.0', () => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      const backendUrl = `http://localhost:${PORT}`;
      const address = server.address();
      const actualAddress = address && typeof address === 'object' 
        ? `${address.address}:${address.port}` 
        : `0.0.0.0:${PORT}`;
      
      console.log(`🚀 Backend: ${backendUrl}`);
      console.log(`🌐 Frontend: ${frontendUrl}`);
      console.log(`📚 Swagger: ${backendUrl}/api-docs`);
      console.log(`🔌 Escuchando en: ${actualAddress}`);
      console.log(`✅ Servidor iniciado correctamente y listo para recibir conexiones`);
      console.log(`\n💡 Para verificar: curl http://localhost:${PORT}/health\n`);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ El puerto ${PORT} ya está en uso.`);
        console.error(`💡 Intentando liberar el puerto automáticamente...`);
        
        // Intentar liberar el puerto automáticamente
        try {
          const { execSync } = require('child_process');
          const pids = execSync(`lsof -ti:${PORT}`, { encoding: 'utf8', stdio: 'pipe' }).trim();
          if (pids) {
            execSync(`kill -9 ${pids}`, { stdio: 'pipe' });
            console.log(`✅ Puerto ${PORT} liberado. Reiniciando servidor...`);
            // Esperar un momento y reintentar
            setTimeout(() => {
              const newServer = app.listen(PORT, '0.0.0.0', () => {
                console.log(`✅ Servidor iniciado en puerto ${PORT} después de liberarlo`);
              });
              newServer.on('error', (retryError: any) => {
                console.error(`❌ Error al reintentar: ${retryError.message}`);
                process.exit(1);
              });
            }, 1000);
            return;
          }
        } catch (autoFreeError) {
          // Si no se puede liberar automáticamente, mostrar instrucciones
          console.error(`⚠️  No se pudo liberar el puerto automáticamente.`);
          console.error(`💡 Para liberar manualmente: lsof -ti:${PORT} | xargs kill -9`);
          console.error(`💡 O cambia el puerto en el .env: PORT=3001`);
        }
      } else if (error.code === 'EACCES') {
        console.error(`❌ No tienes permisos para usar el puerto ${PORT}`);
        console.error(`💡 Intenta usar un puerto mayor a 1024 o ejecuta con sudo`);
      } else {
        console.error('❌ Error al iniciar el servidor:', error);
        console.error(`   Código: ${error.code}`);
        console.error(`   Mensaje: ${error.message}`);
      }
      process.exit(1);
    });

    // Verificar que el servidor está escuchando
    server.on('listening', () => {
      const address = server.address();
      if (address) {
        const addr = typeof address === 'string' ? address : `${address.address}:${address.port}`;
        console.log(`🔌 Servidor escuchando en: ${addr}`);
      }
    });
  })
  .catch((error) => {
    console.error('❌ Error al conectar la base de datos:', error);
    
    // Manejo específico de errores comunes
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Verifica las credenciales en las variables de entorno');
      console.error('   Variables a verificar: DB_USERNAME, DB_PASSWORD');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 ERROR: La base de datos especificada no existe');
      console.error(`   Base de datos intentada: ${process.env.DB_DATABASE || 'nursehelper'}`);
      console.error('');
      console.error('🔧 SOLUCIÓN:');
      console.error('   1. Verifica que la variable DB_DATABASE en Railway esté correcta');
      console.error('   2. Asegúrate de que el nombre de la BD coincida exactamente');
      console.error('   3. Si usas Railway, verifica que la BD esté creada y activa');
      console.error('');
      if (process.env.DB_DATABASE?.toLowerCase().includes('raikway')) {
        console.error('⚠️  DETECTADO: El nombre contiene "raikway" (error de tipeo)');
        console.error('   Debe ser "railway" (con "l" después de "rai")');
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error('💡 ERROR: No se puede conectar al servidor de base de datos');
      console.error(`   Host intentado: ${process.env.DB_HOST || 'localhost'}`);
      console.error(`   Puerto intentado: ${process.env.DB_PORT || '3306'}`);
      console.error('');
      console.error('🔧 POSIBLES SOLUCIONES:');
      console.error('   1. Verifica que el servidor de base de datos esté corriendo');
      console.error('   2. Verifica las variables DB_HOST y DB_PORT en tu archivo .env');
      console.error('   3. Si usas Railway, verifica que el servicio esté activo');
      console.error('   4. Para desarrollo local, asegúrate de que MySQL esté corriendo:');
      console.error('      brew services start mysql');
      console.error('   5. Puedes aumentar el timeout con: DB_CONNECT_TIMEOUT=60000');
      console.error('');
      if (process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') && !process.env.DB_HOST.includes('127.0.0.1')) {
        console.error('⚠️  Estás intentando conectarte a un servidor remoto.');
        console.error('   Para desarrollo local, considera usar:');
        console.error('   DB_HOST=localhost');
        console.error('   DB_PORT=3306');
        console.error('   DB_DATABASE=nursehelper');
      }
    }
    
    process.exit(1);
  });

export default app;

