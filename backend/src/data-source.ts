import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { PendingRegistration } from './entities/PendingRegistration';
import { Area } from './entities/Area';
import { Bed } from './entities/Bed';
import { Patient } from './entities/Patient';
import { Schedule } from './entities/Schedule';
import { Shift } from './entities/Shift';
import { NurseShift } from './entities/NurseShift';
import { ShiftAttendance } from './entities/ShiftAttendance';
import { Medication } from './entities/Medication';
import { MedicationRequest } from './entities/MedicationRequest';
import { DeliveryHistory } from './entities/DeliveryHistory';
import { AdministrationHistory } from './entities/AdministrationHistory';
import { MedicationInventoryMovement } from './entities/MedicationInventoryMovement';
import { ShiftHandoverNote } from './entities/ShiftHandoverNote';
import { PharmacyShiftAttendance } from './entities/PharmacyShiftAttendance';
import { AdminHandoverNote } from './entities/AdminHandoverNote';
import { PatientClinicalNote } from './entities/PatientClinicalNote';
import { UserNotification } from './entities/UserNotification';
import { PatientShiftAssignment } from './entities/PatientShiftAssignment';
import { PatientShiftAssignmentLog } from './entities/PatientShiftAssignmentLog';
import { loadEnv } from './utils/env';
import path from 'path';

loadEnv();

const password = process.env.DB_PASSWORD ?? '';
const databaseName = process.env.DB_DATABASE || 'nursehelper';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: password || '',
  database: databaseName,
  charset: 'utf8mb4',
  synchronize: false,
  logging: false,
  entities: [
    User,
    PendingRegistration,
    Area,
    Bed,
    Patient,
    Schedule,
    Shift,
    NurseShift,
    ShiftAttendance,
    PharmacyShiftAttendance,
    Medication,
    MedicationRequest,
    DeliveryHistory,
    AdministrationHistory,
    MedicationInventoryMovement,
    ShiftHandoverNote,
    AdminHandoverNote,
    PatientClinicalNote,
    UserNotification,
    PatientShiftAssignment,
    PatientShiftAssignmentLog,
  ],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  subscribers: [],
  extra: {
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
    waitForConnections: true,
    queueLimit: 0,
    idleTimeout: 60000,
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '30000'),
    charset: 'utf8mb4',
  },
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
  maxQueryExecutionTime: 1000,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '30000'),
});
