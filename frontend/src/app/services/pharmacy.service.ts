import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { Shift, ShiftAttendanceStatus } from './shifts.service';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PagedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface MedicationRequest {
  id: number;
  requestId: string;
  requestedBy: any;
  medication: any;
  dosage: string;
  quantity: number;
  patientsInfo: any[];
  status: 'pending' | 'in_preparation' | 'ready' | 'delivered';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string;
  createdAt: string;
}

export interface DeliveryHistoryItem {
  id: number;
  deliveryId: string;
  medication: any;
  dosage: string;
  quantity: number;
  requestedBy: any;
  deliveredBy: any;
  patients: string[];
  notes: string;
  deliveredAt: string;
}

export interface DeliveryHistoryResponse {
  deliveries: any[];
  cancelled: any[];
}

export interface DeliveryHistoryPagedResponse extends DeliveryHistoryResponse {
  pagination: PaginationMeta;
  /** Totales reales (p. ej. entregas del día en BD), independientes de la página del listado */
  summary?: {
    deliveredTodayCount: number;
  };
}

/** Respuesta paginada de solicitudes con conteos globales para KPI */
export interface MedicationRequestsPagedResult extends PagedResult<MedicationRequest> {
  openByStatus?: {
    pending: number;
    in_preparation: number;
    ready: number;
  };
}

export type InventoryExpiryClassification = 'none' | 'expired' | 'expiring_soon';

export interface InventoryItem {
  id: number;
  name: string;
  dosage: string;
  description: string;
  stock: number;
  minStock: number;
  location: string;
  expiryDate: string;
  status: 'available' | 'low_stock' | 'out_of_stock' | 'expired';
  expiryClassification: InventoryExpiryClassification;
  daysToExpiry: number | null;
  expiringSoonDays: number;
}

export type InventoryMovementTypeApi =
  | 'entry'
  | 'exit'
  | 'adjustment'
  | 'delivery';

/** Fila de asistencia farmacia (GET `/pharmacy/shift-attendance`). */
export interface PharmacyShiftAttendanceRow {
  pharmacyUserId: number;
  pharmacyUserName: string;
  status: ShiftAttendanceStatus;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  notes?: string | null;
}

/** Respuesta GET `/pharmacy/shift-attendance/summary`. */
export interface PharmacyShiftCoverageSummaryShift {
  shiftId: number;
  shiftType: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  contactName: string | null;
  phone: string | null;
  hasOnDutyContact: boolean;
  attendance: PharmacyShiftAttendanceRow[];
}

export interface PharmacyShiftCoverageSummaryResponse {
  date: string;
  shifts: PharmacyShiftCoverageSummaryShift[];
}

export interface InventoryMovementRow {
  id: number;
  medicationId: number;
  movementType: InventoryMovementTypeApi;
  quantityDelta: number;
  stockBefore: number;
  stockAfter: number;
  reason: string | null;
  createdAt: string;
  performedByName: string | null;
  medicationRequestId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class PharmacyService {
  private apiUrl = `${environment.apiUrl}/pharmacy`;

  constructor(private http: HttpClient) {}

  getMedicationRequests(status?: string): Observable<MedicationRequest[]> {
    const params: any = {};
    if (status) params.status = status;
    return this.http.get<MedicationRequest[]>(`${this.apiUrl}/requests`, { params });
  }

  getMedicationRequestsPaged(page: number, limit: number, status?: string): Observable<MedicationRequestsPagedResult> {
    const params: any = { page: String(page), limit: String(limit) };
    if (status) params.status = status;
    return this.http.get<MedicationRequestsPagedResult>(`${this.apiUrl}/requests`, { params });
  }

  updateRequestStatus(id: number, status: string, rejectionReason?: string, notes?: string): Observable<any> {
    const body: any = { status };
    if (rejectionReason) {
      body.rejectionReason = rejectionReason;
    }
    if (notes) {
      body.notes = notes;
    }
    return this.http.put(`${this.apiUrl}/requests/${id}/status`, body);
  }

  deliverMedication(requestId: number, notes: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/deliver`, { notes });
  }

  getDeliveryHistory(includeCancelled: boolean = false, startDate?: string, endDate?: string): Observable<any> {
    const params: any = {};
    if (includeCancelled) params.includeCancelled = 'true';
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return this.http.get<any>(`${this.apiUrl}/deliveries`, { params });
  }

  getDeliveryHistoryPaged(
    page: number,
    limit: number,
    includeCancelled: boolean = false,
    startDate?: string,
    endDate?: string
  ): Observable<DeliveryHistoryPagedResponse> {
    const params: any = { page: String(page), limit: String(limit) };
    if (includeCancelled) params.includeCancelled = 'true';
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return this.http.get<DeliveryHistoryPagedResponse>(`${this.apiUrl}/deliveries`, { params });
  }

  getInventory(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${this.apiUrl}/inventory`);
  }

  getInventoryPaged(page: number, limit: number): Observable<PagedResult<InventoryItem>> {
    return this.http.get<PagedResult<InventoryItem>>(`${this.apiUrl}/inventory`, {
      params: { page: String(page), limit: String(limit) },
    });
  }

  updateMedicationStock(id: number, stock: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/inventory/${id}/stock`, { stock });
  }

  postInventoryMovement(
    medicationId: number,
    body: {
      type: 'entry' | 'exit' | 'adjustment';
      quantity: number;
      reason?: string;
      /** Solo entradas: actualiza caducidad del SKU (referencia de lote hasta tabla de lotes). */
      expiryDate?: string;
    }
  ): Observable<{ medication: InventoryItem; movement: InventoryMovementRow }> {
    return this.http.post<{ medication: InventoryItem; movement: InventoryMovementRow }>(
      `${this.apiUrl}/inventory/${medicationId}/movements`,
      body
    );
  }

  getInventoryMovements(
    medicationId: number,
    limit: number = 100
  ): Observable<InventoryMovementRow[]> {
    return this.http.get<InventoryMovementRow[]>(`${this.apiUrl}/inventory/movements`, {
      params: { medicationId: String(medicationId), limit: String(limit) },
    });
  }

  getInventoryMovementsPaged(
    medicationId: number,
    page: number,
    limit: number = 50
  ): Observable<PagedResult<InventoryMovementRow>> {
    return this.http.get<PagedResult<InventoryMovementRow>>(`${this.apiUrl}/inventory/movements`, {
      params: { medicationId: String(medicationId), page: String(page), limit: String(limit) },
    });
  }

  createMedication(data: {
    name: string;
    dosage: string;
    description?: string;
    stock?: number;
    minStock?: number;
    location?: string;
    expiryDate?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/inventory`, data);
  }

  deleteMedication(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/inventory/${id}`);
  }

  getWorkShifts(): Observable<Shift[]> {
    return this.http.get<Shift[]>(`${this.apiUrl}/work-shifts`);
  }

  getPharmacyShiftAttendanceSummary(date: string): Observable<PharmacyShiftCoverageSummaryResponse> {
    return this.http.get<PharmacyShiftCoverageSummaryResponse>(`${this.apiUrl}/shift-attendance/summary`, {
      params: { date },
    });
  }

  getPharmacyShiftAttendance(date: string, shiftId: number): Observable<PharmacyShiftAttendanceRow[]> {
    return this.http.get<PharmacyShiftAttendanceRow[]>(`${this.apiUrl}/shift-attendance`, {
      params: { date, shiftId: String(shiftId) },
    });
  }

  savePharmacyShiftAttendance(
    date: string,
    shiftId: number,
    attendance: Array<{
      pharmacyUserId: number;
      status: ShiftAttendanceStatus;
      checkInAt?: string | null;
      checkOutAt?: string | null;
      notes?: string | null;
    }>
  ): Observable<{ message: string; saved: number }> {
    return this.http.post<{ message: string; saved: number }>(`${this.apiUrl}/shift-attendance`, {
      date,
      shiftId,
      attendance,
    });
  }

  createMedicationRequest(data: {
    medicationName: string;
    dosage: string;
    quantity: number;
    patientsInfo: any[];
    priority?: string;
    notes?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests`, data);
  }
}

