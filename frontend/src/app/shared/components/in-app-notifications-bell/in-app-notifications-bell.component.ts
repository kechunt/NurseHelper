import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, DestroyRef, HostListener, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, finalize, interval, of } from 'rxjs';
import { UserNotificationsService, type UserNotificationDto } from '../../../services/user-notifications.service';
import { RealtimeService } from '../../../services/realtime.service';
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
  private readonly realtime = inject(RealtimeService);
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
  expandedView = false;
  selectionMode = false;
  selectedIds = new Set<number>();
  bulkDeleting = false;

  ngOnInit(): void {
    this.loadOnce();

    this.realtime
      .onNotificationUpsert()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => this.mergeNotification(notification));

    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.realtime.isConnected()) {
          this.loadOnce();
        }
      });

    interval(300_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.realtime.isConnected()) {
          this.loadOnce();
        }
      });

    this.destroyRef.onDestroy(() => this.clearMobilePanelTop());
  }

  private mergeNotification(notification: UserNotificationDto): void {
    const idx = this.items.findIndex(
      (n) => n.id === notification.id || n.dedupeKey === notification.dedupeKey,
    );
    if (idx >= 0) {
      const next = [...this.items];
      next[idx] = notification;
      this.items = next.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      return;
    }
    this.items = [notification, ...this.items];
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
      this.selectionMode = false;
      this.selectedIds = new Set();
    }
  }

  closePanel(): void {
    this.panelOpen = false;
    this.clearMobilePanelTop();
    this.selectionMode = false;
    this.selectedIds = new Set();
  }

  toggleExpandedView(ev: Event): void {
    ev.stopPropagation();
    this.expandedView = !this.expandedView;
  }

  toggleSelectionMode(ev: Event): void {
    ev.stopPropagation();
    this.selectionMode = !this.selectionMode;
    if (!this.selectionMode) {
      this.selectedIds = new Set();
    }
  }

  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  toggleSelected(id: number, ev: Event): void {
    ev.stopPropagation();
    const next = new Set(this.selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds = next;
  }

  selectAll(ev: Event): void {
    ev.stopPropagation();
    this.selectedIds = new Set(this.items.map((n) => n.id));
  }

  clearSelection(ev: Event): void {
    ev.stopPropagation();
    this.selectedIds = new Set();
  }

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
        const valid = new Set(list.map((n) => n.id));
        this.selectedIds = new Set([...this.selectedIds].filter((id) => valid.has(id)));
      });
  }

  formatCreatedAt(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
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
        this.selectedIds.delete(n.id);
      },
      error: () => this.toast.error('No se pudo eliminar'),
    });
  }

  deleteSelected(ev: Event): void {
    ev.stopPropagation();
    const ids = [...this.selectedIds];
    if (ids.length === 0) {
      return;
    }
    this.bulkDeleting = true;
    this.notificationsApi.bulkDelete(ids).subscribe({
      next: (res) => {
        this.bulkDeleting = false;
        const removed = new Set(ids);
        this.items = this.items.filter((n) => !removed.has(n.id));
        this.selectedIds = new Set();
        this.selectionMode = false;
        this.toast.success(`${res.affected} notificación(es) eliminada(s)`);
      },
      error: () => {
        this.bulkDeleting = false;
        this.toast.error('No se pudieron eliminar las seleccionadas');
      },
    });
  }

  deleteAll(ev: Event): void {
    ev.stopPropagation();
    if (this.items.length === 0) {
      return;
    }
    if (!window.confirm('¿Eliminar todas las notificaciones visibles? Esta acción no se puede deshacer.')) {
      return;
    }
    this.bulkDeleting = true;
    this.notificationsApi.bulkDeleteAll().subscribe({
      next: (res) => {
        this.bulkDeleting = false;
        this.items = [];
        this.selectedIds = new Set();
        this.selectionMode = false;
        this.toast.success(`${res.affected} notificación(es) eliminada(s)`);
      },
      error: () => {
        this.bulkDeleting = false;
        this.toast.error('No se pudieron eliminar todas');
      },
    });
  }

  onRowClick(n: UserNotificationDto): void {
    if (this.selectionMode) {
      const next = new Set(this.selectedIds);
      if (next.has(n.id)) {
        next.delete(n.id);
      } else {
        next.add(n.id);
      }
      this.selectedIds = next;
      return;
    }
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
    if (
      n.type === 'patient_unassigned' &&
      (this.dashboardKind === 'admin' || this.dashboardKind === 'supervisor')
    ) {
      const base = this.dashboardKind === 'admin' ? '/admin' : '/supervisor';
      void this.router.navigate([base], { queryParams: { tab: 'patients' } });
      this.closePanel();
      return;
    }
    if (n.type === 'nurse_check_in' && this.dashboardKind === 'admin') {
      const nurseId = n.payload?.['nurseId'];
      void this.router.navigate(['/admin'], {
        queryParams: {
          tab: 'schedules',
          ...(typeof nurseId === 'number' ? { attendanceNurseId: nurseId } : {}),
        },
      });
      this.closePanel();
      return;
    }
    if (this.dashboardKind === 'nurse') {
      if (n.type === 'patient_unassigned') {
        void this.router.navigate(['/nurse-dashboard'], { queryParams: { view: 'patients' } });
        this.closePanel();
        return;
      }
      if (n.type === 'handover_missing' || (typeof deep === 'string' && deep.includes('handover'))) {
        void this.router.navigate(['/nurse-dashboard'], { queryParams: { view: 'handover' } });
        this.closePanel();
        return;
      }
      const scheduleId = n.payload?.['scheduleId'];
      if (typeof scheduleId === 'number') {
        void this.router.navigate(['/nurse-dashboard'], {
          queryParams: { view: 'tasks', highlightSchedule: scheduleId },
        });
        this.closePanel();
        return;
      }
    }
    const areaId = n.payload?.['areaId'];
    if (this.dashboardKind === 'admin' || this.dashboardKind === 'supervisor') {
      if (typeof areaId === 'number' || (typeof areaId === 'string' && areaId !== '')) {
        const base = this.dashboardKind === 'admin' ? '/admin' : '/supervisor';
        void this.router.navigate([base], { queryParams: { tab: 'areas' } });
        this.closePanel();
      }
    }
  }
}
