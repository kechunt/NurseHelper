/** Tipos de dominio del panel de administración (HTTP admin). */

export interface Area {
  id?: number;
  name: string;
  description?: string;
  isActive?: boolean;
  beds?: Bed[];
}

export interface AreasShiftCoverageNurse {
  id: number;
  firstName: string;
  lastName: string;
}

export interface AreasShiftCoverageRow {
  areaId: number;
  nurses: AreasShiftCoverageNurse[];
}

export interface AdminHandoverNoteDto {
  id: number;
  noteDate: string;
  shiftSlot: string;
  body: string;
  authorUserId: number;
  updatedAt: string;
}

export interface AreasShiftCoveragePayload {
  date: string;
  hasActiveShift: boolean;
  shiftId: number | null;
  shiftName: string | null;
  shiftTime: string | null;
  message?: string;
  areas: AreasShiftCoverageRow[];
}

export interface Bed {
  id?: number;
  bedNumber: string;
  areaId: number;
  patientId?: number | null;
  area?: Area;
  patient?: Patient | null;
  notes?: string;
  isActive?: boolean;
}

export interface PatientsPageResult {
  items: Patient[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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
  area?: Area | null;
  bedId?: number | null;
  areaId?: number | null;
  areaName?: string;
  bedNumber?: string;
  assignedToId?: number | null;
  assignedTo?: { id: number; firstName?: string; lastName?: string; role?: string } | null;
  assignmentStatus?: 'pending' | 'assigned';
  lastAssignmentAt?: Date | string | null;
}

export interface Schedule {
  id?: number;
  patientId: number;
  assignedToId?: number | null;
  type: 'medication' | 'check' | 'treatment' | 'other';
  status: 'pending' | 'completed' | 'missed' | 'cancelled';
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
}
