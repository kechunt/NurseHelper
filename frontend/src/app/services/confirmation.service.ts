import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface ConfirmationOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmationService {
  private confirmationSubject = new Subject<ConfirmationOptions & { resolve: (value: boolean) => void }>();

  /**
   * Mostrar confirmación y retornar Promise
   */
  confirm(options: ConfirmationOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmationSubject.next({
        ...options,
        resolve,
      });
    });
  }

  /**
   * Observable para suscribirse a confirmaciones
   */
  getConfirmation(): Observable<ConfirmationOptions & { resolve: (value: boolean) => void }> {
    return this.confirmationSubject.asObservable();
  }
}
