/**
 * Uso de ToastService (toasts en señal).
 * Fuente: frontend/src/app/services/toast.service.ts
 * Requisito: <app-toast-container /> en el template raíz (ver app.html del proyecto).
 */
import { Component } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-ejemplo',
  standalone: true,
  template: ``,
})
export class EjemploToastComponent {
  constructor(private toast: ToastService) {}

  guardar(): void {
    this.toast.success('Guardado correctamente');
    this.toast.error('No se pudo completar la operación');
    this.toast.warning('Revisa los datos');
    this.toast.info('Sincronización en curso');
  }
}
