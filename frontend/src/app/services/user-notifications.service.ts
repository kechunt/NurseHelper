import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type UserNotificationSeverity = 'info' | 'warning' | 'critical';

export interface UserNotificationDto {
  id: number;
  type: string;
  severity: UserNotificationSeverity;
  requiresAck: boolean;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  dedupeKey: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class UserNotificationsService {
  private readonly base = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  list(): Observable<UserNotificationDto[]> {
    return this.http.get<UserNotificationDto[]>(this.base);
  }

  markRead(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/read`, {});
  }

  acknowledge(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/ack`, {});
  }

  markAllRead(): Observable<{ message: string; affected: number }> {
    return this.http.patch<{ message: string; affected: number }>(`${this.base}/read-all`, {});
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}
