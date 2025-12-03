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
import { loadEnv } from './utils/env';

loadEnv();

const password = process.env.DB_PASSWORD || 'Loktarogar';
if (!process.env.DB_PASSWORD) {
  console.warn('⚠️  DB_PASSWORD no encontrado en .env, usando valor por defecto');
}

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: password || '',
  database: process.env.DB_DATABASE || 'nursehelper',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
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
  ],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: ['src/subscribers/**/*.ts'],
});

