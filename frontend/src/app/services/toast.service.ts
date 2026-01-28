import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  private defaultDuration = 5000; // 5 segundos

  /**
   * Mostrar toast de éxito
   */
  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  /**
   * Mostrar toast de error
   */
  error(message: string, duration?: number): void {
    this.show(message, 'error', duration || 7000); // Errores se muestran más tiempo
  }

  /**
   * Mostrar toast de advertencia
   */
  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  /**
   * Mostrar toast informativo
   */
  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  /**
   * Mostrar toast genérico
   */
  show(message: string, type: ToastType = 'info', duration?: number, action?: Toast['action']): void {
    const toast: Toast = {
      id: this.generateId(),
      message,
      type,
      duration: duration || this.defaultDuration,
      action,
    };

    this.toasts.update((toasts) => [...toasts, toast]);

    // Auto-remover después de la duración
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.remove(toast.id);
      }, toast.duration);
    }
  }

  /**
   * Remover toast
   */
  remove(id: string): void {
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  /**
   * Limpiar todos los toasts
   */
  clear(): void {
    this.toasts.set([]);
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
