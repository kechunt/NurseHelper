/**
 * LoadingService: contador reactivo para spinners globales.
 * Fuente: frontend/src/app/services/loading.service.ts
 */
import { Component, inject } from '@angular/core';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-ejemplo',
  standalone: true,
  template: `
    @if (loading.isLoading()) {
      <p>Cargando…</p>
    }
  `,
})
export class EjemploLoadingComponent {
  protected loading = inject(LoadingService);

  cargar(): void {
    this.loading.start();
    setTimeout(() => this.loading.stop(), 1000);
  }
}
