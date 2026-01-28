import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$: Observable<Notification[]> = this.notificationsSubject.asObservable();

  private defaultDuration = 5000; // 5 segundos

  constructor() {}

  /**
   * Muestra una notificación de éxito
   */
  showSuccess(message: string, duration?: number): void {
    this.addNotification({
      type: 'success',
      message,
      duration: duration || this.defaultDuration
    });
  }

  /**
   * Muestra una notificación de error
   */
  showError(message: string, duration?: number): void {
    this.addNotification({
      type: 'error',
      message,
      duration: duration || this.defaultDuration * 1.5 // Errores se muestran más tiempo
    });
  }

  /**
   * Muestra una notificación de advertencia
   */
  showWarning(message: string, duration?: number): void {
    this.addNotification({
      type: 'warning',
      message,
      duration: duration || this.defaultDuration
    });
  }

  /**
   * Muestra una notificación informativa
   */
  showInfo(message: string, duration?: number): void {
    this.addNotification({
      type: 'info',
      message,
      duration: duration || this.defaultDuration
    });
  }

  /**
   * Agrega una notificación a la lista
   */
  private addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date()
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, newNotification]);

    // Auto-remover después de la duración especificada
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(newNotification.id);
      }, newNotification.duration);
    }
  }

  /**
   * Remueve una notificación por ID
   */
  removeNotification(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next(
      currentNotifications.filter(n => n.id !== id)
    );
  }

  /**
   * Limpia todas las notificaciones
   */
  clearAll(): void {
    this.notificationsSubject.next([]);
  }

  /**
   * Genera un ID único para la notificación
   */
  private generateId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
