import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private loadingCount = signal<number>(0);
  isLoading = signal<boolean>(false);

  /**
   * Iniciar loading
   */
  start(): void {
    this.loadingCount.update((count) => count + 1);
    this.isLoading.set(true);
  }

  /**
   * Detener loading
   */
  stop(): void {
    this.loadingCount.update((count) => {
      const newCount = Math.max(0, count - 1);
      if (newCount === 0) {
        this.isLoading.set(false);
      }
      return newCount;
    });
  }

  /**
   * Resetear loading
   */
  reset(): void {
    this.loadingCount.set(0);
    this.isLoading.set(false);
  }

  /**
   * Ejecutar función con loading automático
   */
  async withLoading<T>(fn: () => Promise<T>): Promise<T> {
    this.start();
    try {
      return await fn();
    } finally {
      this.stop();
    }
  }
}
