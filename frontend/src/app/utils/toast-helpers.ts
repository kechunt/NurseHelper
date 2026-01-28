/**
 * Helpers para facilitar el uso de ToastService
 * Proporciona métodos de conveniencia para casos comunes
 */

import { ToastService } from '../services/toast.service';

export class ToastHelpers {
  /**
   * Mostrar éxito después de operación
   */
  static showSuccess(toastService: ToastService, message: string): void {
    toastService.success(message);
  }

  /**
   * Mostrar error con detalles
   */
  static showError(toastService: ToastService, error: any, defaultMessage: string = 'Error desconocido'): void {
    const message = error?.error?.message || error?.message || defaultMessage;
    toastService.error(message);
  }

  /**
   * Mostrar confirmación de acción
   */
  static showActionSuccess(toastService: ToastService, action: string, item: string): void {
    toastService.success(`${action} exitosamente: ${item}`);
  }

  /**
   * Mostrar advertencia de validación
   */
  static showValidationWarning(toastService: ToastService, field: string): void {
    toastService.warning(`Por favor complete el campo: ${field}`);
  }
}
