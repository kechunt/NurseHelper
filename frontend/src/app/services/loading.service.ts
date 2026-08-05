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
}
