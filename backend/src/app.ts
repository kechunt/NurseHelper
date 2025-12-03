import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { loadEnv } from './utils/env';
import { AppDataSource } from './data-source';
import { setupSwagger } from './config/swagger';
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

loadEnv();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad
app.use(helmet());

// Configuración de CORS mejorada para producción
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:4200'];

// Permitir todos los dominios de Vercel si no se especifica CORS_ORIGIN en producción
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  allowedOrigins.push(/^https:\/\/.*\.vercel\.app$/);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Verificar si el origin está permitido
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          return origin === allowedOrigin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });
      
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
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'NurseHelper API funcionando' });
});

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
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Base de datos conectada exitosamente');
    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📚 Documentación Swagger disponible en http://localhost:${PORT}/api-docs`);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ El puerto ${PORT} ya está en uso. Por favor, cierra la aplicación que lo está usando o cambia el puerto en el .env`);
      } else {
        console.error('❌ Error al iniciar el servidor:', error);
      }
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error('❌ Error al conectar la base de datos:', error);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Verifica las credenciales en el archivo .env');
      console.error('   Asegúrate de que DB_PASSWORD=Loktarogar esté configurado correctamente');
    }
    process.exit(1);
  });

export default app;

