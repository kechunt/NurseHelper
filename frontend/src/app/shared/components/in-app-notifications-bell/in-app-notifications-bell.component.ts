import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
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

  /** `admin` | `supervisor` | `nurse` — solo afecta navegación opcional desde el payload. */
  @Input() dashboardKind: 'admin' | 'supervisor' | 'nurse' = 'admin';

  items: UserNotificationDto[] = [];
  panelOpen = false;
  loading = false;

  ngOnInit(): void {
    this.loadOnce();
    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadOnce());
  }

  togglePanel(): void {
    this.panelOpen = !this.panelOpen;
    if (this.panelOpen) {
      this.refresh();
    }
  }

  closePanel(): void {
    this.panelOpen = false;
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
