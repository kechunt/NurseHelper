import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { Area } from './entities/Area';
import { Bed } from './entities/Bed';
import { Patient } from './entities/Patient';
import { Schedule } from './entities/Schedule';
import { Shift } from './entities/Shift';
import { NurseShift } from './entities/NurseShift';
import { Medication } from './entities/Medication';
import { MedicationRequest } from './entities/MedicationRequest';
import { DeliveryHistory } from './entities/DeliveryHistory';
import { AdministrationHistory } from './entities/AdministrationHistory';
import { MedicationInventoryMovement } from './entities/MedicationInventoryMovement';
import { loadEnv } from './utils/env';

loadEnv();

const password = process.env.DB_PASSWORD || 'Loktarogar';
const databaseName = process.env.DB_DATABASE || 'nursehelper';

if (databaseName.toLowerCase().includes('raikway')) {
  console.error('❌ ERROR: El nombre de la base de datos contiene un error de tipeo: "raikway"');
  console.error('💡 Debe ser "railway" (con "l" después de "rai")');
  process.exit(1);
}

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: password || '',
  database: databaseName,
  synchronize: false,
  logging: false,
  entities: [
    User,
    Area,
    Bed,
    Patient,
    Schedule,
    Shift,
    NurseShift,
    Medication,
    MedicationRequest,
    DeliveryHistory,
    AdministrationHistory,
    MedicationInventoryMovement,
  ],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: ['src/subscribers/**/*.ts'],
  extra: {
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
    waitForConnections: true,
    queueLimit: 0,
    idleTimeout: 60000,
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '30000'), // 30 segundos por defecto
  },
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
  maxQueryExecutionTime: 1000,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '30000'), // 30 segundos por defecto
});

