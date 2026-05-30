import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-offline-status-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="!online" class="offline-status-banner" role="status" aria-live="polite">
      Sin conexión — los cambios se sincronizarán al reconectar
    </div>
  `,
  styles: [
    `
      .offline-status-banner {
        background: #7c2d12;
        color: #fff;
        text-align: center;
        padding: 0.45rem 0.75rem;
        font-size: 0.875rem;
        font-weight: 600;
      }
    `,
  ],
})
export class OfflineStatusBannerComponent implements OnInit, OnDestroy {
  online = true;
  private readonly onOnline = () => {
    this.online = true;
  };
  private readonly onOffline = () => {
    this.online = false;
  };

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.online = navigator.onLine;
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }
}
