import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, DestroyRef, HostListener, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, finalize, interval, of } from 'rxjs';
import { UserNotificationsService, type UserNotificationDto } from '../../../services/user-notifications.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-in-app-notifications-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './in-app-notifications-bell.component.html',
  styleUrl: './in-app-notifications-bell.component.css',
})
export class InAppNotificationsBellComponent implements OnInit {
  private readonly notificationsApi = inject(UserNotificationsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  /** `admin` | `supervisor` | `nurse` — solo afecta navegación opcional desde el payload. */
  @Input() dashboardKind: 'admin' | 'supervisor' | 'nurse' = 'admin';

  get notificationBellToggleId(): string {
    return `in-app-notifications-bell-${this.dashboardKind}-toggle`;
  }

  get notificationBellPanelId(): string {
    return `in-app-notifications-bell-${this.dashboardKind}-panel`;
  }

  get notificationBellMarkAllReadId(): string {
    return `in-app-notifications-bell-${this.dashboardKind}-mark-all-read-btn`;
  }

  get notificationBellRefreshId(): string {
    return `in-app-notifications-bell-${this.dashboardKind}-refresh-btn`;
  }

  get notificationBellLoadingId(): string {
    return `in-app-notifications-bell-${this.dashboardKind}-loading`;
  }

  get notificationBellEmptyId(): string {
    return `in-app-notifications-bell-${this.dashboardKind}-empty`;
  }

  notificationBellRowOpenBtnId(n: UserNotificationDto): string {
    return `in-app-notifications-bell-${this.dashboardKind}-row-${n.id}-open-btn`;
  }

  notificationBellRowMarkReadBtnId(n: UserNotificationDto): string {
    return `in-app-notifications-bell-${this.dashboardKind}-row-${n.id}-mark-read-btn`;
  }

  notificationBellRowAcknowledgeBtnId(n: UserNotificationDto): string {
    return `in-app-notifications-bell-${this.dashboardKind}-row-${n.id}-acknowledge-btn`;
  }

  notificationBellRowRemoveBtnId(n: UserNotificationDto): string {
    return `in-app-notifications-bell-${this.dashboardKind}-row-${n.id}-remove-btn`;
  }

  items: UserNotificationDto[] = [];
  panelOpen = false;
  loading = false;

  ngOnInit(): void {
    this.loadOnce();
    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadOnce());
    this.destroyRef.onDestroy(() => this.clearMobilePanelTop());
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.panelOpen) {
      this.syncMobilePanelTop();
    }
  }

  togglePanel(): void {
    this.panelOpen = !this.panelOpen;
    if (this.panelOpen) {
      this.refresh();
      queueMicrotask(() => this.syncMobilePanelTop());
    } else {
      this.clearMobilePanelTop();
    }
  }

  closePanel(): void {
    this.panelOpen = false;
    this.clearMobilePanelTop();
  }

  /** En móvil, coloca el panel bajo la cabecera real (enfermería tiene dos filas). */
  private syncMobilePanelTop(): void {
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 768px)').matches) {
      this.clearMobilePanelTop();
      return;
    }
    const header = this.document.querySelector<HTMLElement>('.dashboard-header');
    if (!header) {
      return;
    }
    const top = Math.max(8, Math.round(header.getBoundingClientRect().bottom + 8));
    this.document.documentElement.style.setProperty('--nh-notif-panel-top-active', `${top}px`);
  }

  private clearMobilePanelTop(): void {
    this.document.documentElement.style.removeProperty('--nh-notif-panel-top-active');
  }

  refresh(): void {
    this.loadOnce();
  }

  private loadOnce(): void {
    this.loading = true;
    this.notificationsApi
      .list()
      .pipe(
        catchError(() => {
          this.toast.error('No se pudieron cargar las notificaciones');
          return of([] as UserNotificationDto[]);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe((list) => {
        this.items = list;
      });
  }

  unreadCount(): number {
    return this.items.filter((n) => !n.readAt).length;
  }

  pendingAckCount(): number {
    return this.items.filter((n) => n.requiresAck && !n.acknowledgedAt).length;
  }

  markRead(n: UserNotificationDto, ev: Event): void {
    ev.stopPropagation();
    if (n.readAt) return;
    this.notificationsApi.markRead(n.id).subscribe({
      next: () => this.patchLocal(n.id, { readAt: new Date().toISOString() }),
      error: () => this.toast.error('No se pudo marcar como leída'),
    });
  }

  acknowledge(n: UserNotificationDto, ev: Event): void {
    ev.stopPropagation();
    this.notificationsApi.acknowledge(n.id).subscribe({
      next: () => {
        const now = new Date().toISOString();
        this.patchLocal(n.id, { acknowledgedAt: now, readAt: now });
        this.navigateFromPayload(n);
      },
      error: () => this.toast.error('No se pudo reconocer la alerta'),
    });
  }

  markAllRead(ev: Event): void {
    ev.stopPropagation();
    this.notificationsApi.markAllRead().subscribe({
      next: () => {
        const now = new Date().toISOString();
        this.items = this.items.map((n) => ({ ...n, readAt: n.readAt ?? now }));
      },
      error: () => this.toast.error('No se pudo marcar todo como leído'),
    });
  }

  remove(n: UserNotificationDto, ev: Event): void {
    ev.stopPropagation();
    this.notificationsApi.delete(n.id).subscribe({
      next: () => {
        this.items = this.items.filter((x) => x.id !== n.id);
      },
      error: () => this.toast.error('No se pudo eliminar'),
    });
  }

  onRowClick(n: UserNotificationDto): void {
    if (!n.readAt) {
      this.notificationsApi.markRead(n.id).subscribe({
        next: () => this.patchLocal(n.id, { readAt: new Date().toISOString() }),
        error: () => undefined,
      });
    }
    this.navigateFromPayload(n);
  }

  private patchLocal(id: number, partial: Partial<UserNotificationDto>): void {
    this.items = this.items.map((x) => (x.id === id ? { ...x, ...partial } : x));
  }

  private navigateFromPayload(n: UserNotificationDto): void {
    const deep = n.payload?.['deepLink'];
    if (typeof deep === 'string' && deep.startsWith('/')) {
      void this.router.navigateByUrl(deep);
      this.closePanel();
      return;
    }
    const areaId = n.payload?.['areaId'];
    if (this.dashboardKind === 'admin' || this.dashboardKind === 'supervisor') {
      if (typeof areaId === 'number' || (typeof areaId === 'string' && areaId !== '')) {
        const base = this.dashboardKind === 'admin' ? '/admin-dashboard' : '/supervisor-dashboard';
        void this.router.navigate([base], { queryParams: { tab: 'areas' } });
        this.closePanel();
      }
    }
  }
}
