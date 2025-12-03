/**
 * Tipos compartidos de la aplicación NurseHelper
 * Centraliza todas las interfaces para evitar duplicación
 */

// ============================================
// USER TYPES
// ============================================

export type UserRole = 'admin' | 'nurse' | 'supervisor' | 'pharmacy';

export interface User {
  id?: number;
  username: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive?: boolean;
  maxPatients?: number | null;
  assignedAreaId?: number | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================
// AREA TYPES
// ============================================

export interface Area {
  id?: number;
  name: string;
  description?: string;
  isActive?: boolean;
  beds?: Bed[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============================================
// BED TYPES
// ============================================

export interface Bed {
  id?: number;
  bedNumber: string;
  areaId: number;
  patientId?: number | null;
  area?: Area;
  patient?: Patient | null;
  notes?: string;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface BedWithPatient {
  id: number;
  bedNumber: string;
  areaId: number;
  areaName: string;
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    age: number;
    medicalObservations?: string;
  } | null;
}

// ============================================
// PATIENT TYPES
// ============================================

export interface Patient {
  id?: number;
  firstName: string;
  lastName: string;
  identificationNumber?: string;
  dateOfBirth?: Date | string;
  gender?: string;
  phone?: string;
  address?: string;
  medicalHistory?: string;
  allergies?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  medicalObservations?: string;
  specialNeeds?: string;
  generalObservations?: string;
  medications?: string | any;
  treatmentHistory?: string | any;
  pendingTasks?: string | any;
  isActive?: boolean;
  bed?: Bed | null;
  bedId?: number | null;
  areaId?: number | null;
  areaName?: string;
  bedNumber?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PatientDetail {
  id: number;
  firstName: string;
  lastName: string;
  bedNumber: string;
  age: number;
  diagnosis: string;
  medications: Medication[];
  medicationsDetail: Medication[];
  todaySchedule: ScheduleItem[];
  treatmentHistory: TreatmentRecord[];
  pendingTasks: number;
  priority: 'normal' | 'critical';
  medicalObservations?: string;
  allergies?: string;
  specialNeeds?: string;
  generalObservations?: string;
}

// ============================================
// SCHEDULE TYPES
// ============================================

export type ScheduleType = 'medication' | 'check' | 'treatment' | 'other';
export type ScheduleStatus = 'pending' | 'completed' | 'missed' | 'cancelled';

export interface Schedule {
  id?: number;
  patientId: number;
  assignedToId?: number | null;
  type: ScheduleType;
  status: ScheduleStatus;
  scheduledTime: Date | string;
  description: string;
  notes?: string;
  medication?: string;
  dosage?: string;
  patient?: Patient;
  assignedTo?: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ScheduleItem {
  time: string;
  type: 'medication' | 'checkup' | 'treatment';
  description: string;
  completed: boolean;
}

// ============================================
// MEDICATION TYPES
// ============================================

export interface Medication {
  id?: number;
  name: string;
  dosage: string;
  description?: string;
  frequency?: string;
  schedules?: string;
  notes?: string;
  stock?: number;
  minStock?: number;
  location?: string;
  expiryDate?: Date | string;
  status?: 'available' | 'low_stock' | 'out_of_stock' | 'expired';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface MedicationForPharmacy {
  medicationName: string;
  dosage: string;
  patientsInfo: {
    patientName: string;
    bedNumber: string;
    times: string[];
  }[];
  totalDoses: number;
}

// ============================================
// SHIFT TYPES
// ============================================

export type ShiftType = 'morning' | 'afternoon' | 'night';

export interface Shift {
  id: number;
  type: ShiftType;
  name: string;
  startTime: string;
  endTime: string;
  durationHours?: number;
  isActive: boolean;
  createdAt?: Date | string;
}

export interface NurseShift {
  id?: number;
  nurseId: number;
  shiftId: number;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  weekStartDate: Date | string;
  createdAt?: Date | string;
}

export interface WeeklySchedule {
  nurseId: number;
  nurseName: string;
  monday: string | number;
  tuesday: string | number;
  wednesday: string | number;
  thursday: string | number;
  friday: string | number;
  saturday: string | number;
  sunday: string | number;
}

// ============================================
// PHARMACY TYPES
// ============================================

export type RequestStatus = 'pending' | 'in_preparation' | 'ready' | 'delivered' | 'cancelled';
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface MedicationRequest {
  id: number;
  requestId: string;
  requestedById: number;
  requestedBy?: User;
  medicationId?: number;
  medication?: Medication;
  dosage: string;
  quantity: number;
  patientsInfo: any[];
  status: RequestStatus;
  priority: RequestPriority;
  scheduledTimes?: any;
  notes?: string;
  requestedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface DeliveryHistory {
  id: number;
  requestId: number;
  deliveredAt: Date | string;
  deliveredById: number;
  deliveredBy?: User;
  notes?: string;
  request?: MedicationRequest;
}

// ============================================
// STATS TYPES
// ============================================

export interface NurseStats {
  nurseName: string;
  assignedArea: string;
  maxPatients: number;
  assignedPatientsCount: number;
  pendingTasksCount: number;
  medicationsToday: number;
}

export interface PharmacyStats {
  pendingRequests: number;
  urgentRequests: number;
  deliveriesToday: number;
  lowStockItems: number;
}

// ============================================
// TREATMENT TYPES
// ============================================

export interface TreatmentRecord {
  date: string;
  time: string;
  type: string;
  nurseName: string;
  description: string;
}

// ============================================
// PAGINATION TYPES
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

// ============================================
// ERROR TYPES
// ============================================

export enum ErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  CAPACITY_EXCEEDED = 'CAPACITY_EXCEEDED',
  MEDICATION_CONFLICT = 'MEDICATION_CONFLICT',
  PATIENT_NOT_FOUND = 'PATIENT_NOT_FOUND',
  BED_OCCUPIED = 'BED_OCCUPIED',
  AREA_NOT_FOUND = 'AREA_NOT_FOUND',
  SCHEDULE_CONFLICT = 'SCHEDULE_CONFLICT',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: any;
}

// ============================================
// FORM TYPES
// ============================================

export interface LoginForm {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface MedicationForm {
  patientId: number;
  medication: string;
  dosage: string;
  frequency: string;
  times: string[];
  days: string | string[];
  startDate?: Date | string;
  endDate?: Date | string;
  duration?: number;
  durationUnit?: 'days' | 'weeks' | 'months';
  notes?: string;
}

// ============================================
// UTILITY TYPES
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

