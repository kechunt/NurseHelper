import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

  updateRequestStatus(id: number, status: string, notes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/requests/${id}/status`, { status, notes });
  }

  deliverMedication(requestId: number, notes: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/deliver`, { notes });
  }

  getDeliveryHistory(startDate?: string, endDate?: string): Observable<DeliveryHistoryItem[]> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return this.http.get<DeliveryHistoryItem[]>(`${this.apiUrl}/deliveries`, { params });
  }

  getInventory(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${this.apiUrl}/inventory`);
  }

  updateMedicationStock(id: number, stock: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/inventory/${id}/stock`, { stock });
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

