import { Injectable, effect, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import type { UserNotificationDto } from './user-notifications.service';

export type NurseDashboardInvalidateScope = 'all' | 'primary' | 'secondary';

const SOCKET_PATH = '/api/socket.io';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private socket: Socket | null = null;
  private connected = false;

  private readonly notificationUpsertSubject = new Subject<UserNotificationDto>();
  private readonly nurseDashboardInvalidateSubject = new Subject<{ scope: NurseDashboardInvalidateScope }>();
  private readonly adminOperationalInvalidateSubject = new Subject<void>();

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      const token = this.auth.getToken();
      if (user && token) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  connect(): void {
    const token = this.auth.getToken();
    if (!token || this.socket?.connected) {
      return;
    }
    this.disconnect();

    this.socket = io({
      path: SOCKET_PATH,
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionDelayMax: 10_000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
    });

    this.socket.on('connect_error', () => {
      this.connected = false;
    });

    this.socket.on('notification:upsert', (payload: { notification?: UserNotificationDto }) => {
      if (payload?.notification) {
        this.notificationUpsertSubject.next(payload.notification);
      }
    });

    this.socket.on(
      'nurse:dashboard:invalidate',
      (payload: { scope?: NurseDashboardInvalidateScope }) => {
        const scope = payload?.scope ?? 'all';
        this.nurseDashboardInvalidateSubject.next({ scope });
      },
    );

    this.socket.on('admin:operational:invalidate', () => {
      this.adminOperationalInvalidateSubject.next();
    });
  }

  disconnect(): void {
    this.connected = false;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  onNotificationUpsert(): Observable<UserNotificationDto> {
    return this.notificationUpsertSubject.asObservable();
  }

  onNurseDashboardInvalidate(): Observable<{ scope: NurseDashboardInvalidateScope }> {
    return this.nurseDashboardInvalidateSubject.asObservable();
  }

  onAdminOperationalInvalidate(): Observable<void> {
    return this.adminOperationalInvalidateSubject.asObservable();
  }
}
