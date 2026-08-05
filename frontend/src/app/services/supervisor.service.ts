import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BackupListItem {
  filename: string;
  size: number;
  createdAt: string;
  type?: 'full' | 'incremental';
}

export interface SupervisorWebhook {
  id: number;
  url: string;
  events: string[];
  active: boolean;
}

export interface SupervisorWebhookEvent {
  event: string;
  label: string;
}

export interface SupervisorPlatformInfo {
  environment: string;
  publicOrigin: string | null;
  smtpConfigured: boolean;
  emailFrom: string | null;
  timezone: string;
  backupEnabled: boolean;
  backupRetentionDays: number;
}

export interface SupervisorAuditLog {
  userId?: number;
  action: string;
  resourceType: string;
  resourceId?: number | string;
  details?: unknown;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface HealthDetailedStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: { status: 'healthy' | 'degraded' | 'unhealthy'; responseTime: number; message?: string };
    memory: { status: 'healthy' | 'degraded' | 'unhealthy'; used: number; total: number; percentage: number };
    disk: { status: 'healthy' | 'degraded' | 'unhealthy'; used: number; total: number; percentage: number };
  };
}

export interface HealthMetricsData {
  timestamp: string;
  system: {
    cpu: { usage: number; cores: number };
    memory: { used: number; total: number; free: number; percentage: number };
    uptime: number;
  };
  application: {
    requests: { total: number; perMinute: number; errors: number; errorRate: number };
    database: { connections: number; queries: number; slowQueries: number };
  };
}

/**
 * Servicio del panel de supervisión del sistema: respaldos, webhooks, auditoría,
 * metadatos de plataforma y health checks. Requiere rol `supervisor`.
 */
@Injectable({
  providedIn: 'root',
})
export class SupervisorService {
  constructor(private http: HttpClient) {}

  // ===== Backups =====

  listBackups(): Observable<{ backups: BackupListItem[]; lastBackup: BackupListItem | null }> {
    return this.http.get<{ backups: BackupListItem[]; lastBackup: BackupListItem | null }>(
      `${environment.apiUrl}/backup`
    );
  }

  createBackup(
    type: 'full' | 'incremental' = 'full',
    name?: string
  ): Observable<{ message: string; backup: BackupListItem }> {
    const body: { type: 'full' | 'incremental'; name?: string } = { type };
    const trimmed = name?.trim();
    if (trimmed) {
      body.name = trimmed;
    }
    return this.http.post<{ message: string; backup: BackupListItem }>(`${environment.apiUrl}/backup`, body);
  }

  verifyBackup(filename: string): Observable<{ valid: boolean; backup: BackupListItem }> {
    const params = new HttpParams().set('filename', filename);
    return this.http.get<{ valid: boolean; backup: BackupListItem }>(`${environment.apiUrl}/backup/verify`, {
      params,
    });
  }

  restoreBackup(filename: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/backup/restore`, { filename });
  }

  testRestore(filename: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${environment.apiUrl}/backup/test-restore`, {
      filename,
    });
  }

  // ===== Webhooks =====

  listWebhooks(): Observable<{ webhooks: SupervisorWebhook[] }> {
    return this.http.get<{ webhooks: SupervisorWebhook[] }>(`${environment.apiUrl}/webhooks`);
  }

  listWebhookEvents(): Observable<{ events: SupervisorWebhookEvent[] }> {
    return this.http.get<{ events: SupervisorWebhookEvent[] }>(`${environment.apiUrl}/webhooks/events`);
  }

  registerWebhook(
    url: string,
    events: string[],
    secret?: string
  ): Observable<{ message: string; webhook: SupervisorWebhook }> {
    const body: { url: string; events: string[]; secret?: string } = { url, events };
    if (secret?.trim()) {
      body.secret = secret.trim();
    }
    return this.http.post<{ message: string; webhook: SupervisorWebhook }>(
      `${environment.apiUrl}/webhooks/register`,
      body
    );
  }

  deleteWebhook(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/webhooks/${id}`);
  }

  testWebhook(id: number): Observable<{ message: string; result: unknown }> {
    return this.http.post<{ message: string; result: unknown }>(`${environment.apiUrl}/webhooks/test/${id}`, {});
  }

  // ===== Plataforma / auditoría =====

  getPlatformInfo(): Observable<SupervisorPlatformInfo> {
    return this.http.get<SupervisorPlatformInfo>(`${environment.apiUrl}/supervisor/platform`);
  }

  getRecentAudit(limit = 50): Observable<{ events: SupervisorAuditLog[] }> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<{ events: SupervisorAuditLog[] }>(`${environment.apiUrl}/supervisor/audit-recent`, {
      params,
    });
  }

  // ===== Health =====

  getHealthDetailed(): Observable<HealthDetailedStatus> {
    return this.http.get<HealthDetailedStatus>(`${environment.apiUrl}/health/detailed`);
  }

  getHealthMetrics(): Observable<HealthMetricsData> {
    return this.http.get<HealthMetricsData>(`${environment.apiUrl}/health/metrics`);
  }
}
