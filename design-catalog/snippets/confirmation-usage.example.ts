/**
 * Uso de ConfirmationService + modal global.
 * Fuente: frontend/src/app/services/confirmation.service.ts
 * Requisito: <app-confirmation-wrapper /> en app (ya incluido en App).
 */
import { Component } from '@angular/core';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  selector: 'app-ejemplo',
  standalone: true,
  template: ``,
})
export class EjemploConfirmacionComponent {
  constructor(private confirmation: ConfirmationService) {}

  async borrar(): Promise<void> {
    const ok = await this.confirmation.confirm({
      title: 'Confirmar',
      message: '¿Eliminar este registro?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
    });
    if (ok) {
      // continuar
    }
  }
}
