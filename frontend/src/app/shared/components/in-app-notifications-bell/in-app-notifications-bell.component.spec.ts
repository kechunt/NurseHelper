import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import type { UserNotificationDto } from '../../../services/user-notifications.service';
import { UserNotificationsService } from '../../../services/user-notifications.service';
import { RealtimeService } from '../../../services/realtime.service';
import { ToastService } from '../../../services/toast.service';
import { InAppNotificationsBellComponent } from './in-app-notifications-bell.component';

describe('InAppNotificationsBellComponent', () => {
  let fixture: ComponentFixture<InAppNotificationsBellComponent>;

  const sampleNotification: UserNotificationDto = {
    id: 42,
    type: 'info',
    severity: 'info',
    requiresAck: true,
    title: 'Título',
    body: 'Cuerpo',
    payload: null,
    dedupeKey: 'k42',
    readAt: null,
    acknowledgedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const notificationsStub = {
    list: jasmine.createSpy('list').and.returnValue(of([sampleNotification])),
    markRead: jasmine.createSpy('markRead').and.returnValue(of({})),
    markAllRead: jasmine.createSpy('markAllRead').and.returnValue(of({})),
    acknowledge: jasmine.createSpy('acknowledge').and.returnValue(of({})),
    delete: jasmine.createSpy('delete').and.returnValue(of({})),
  };

  const notificationUpsert$ = new Subject<UserNotificationDto>();
  const realtimeStub = {
    isConnected: jasmine.createSpy('isConnected').and.returnValue(false),
    onNotificationUpsert: jasmine.createSpy('onNotificationUpsert').and.returnValue(notificationUpsert$.asObservable()),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InAppNotificationsBellComponent],
      providers: [
        { provide: UserNotificationsService, useValue: notificationsStub },
        { provide: RealtimeService, useValue: realtimeStub },
        { provide: ToastService, useValue: { error: jasmine.createSpy('toastError') } },
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate'),
            navigateByUrl: jasmine.createSpy('navigateByUrl'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InAppNotificationsBellComponent);
    fixture.componentRef.setInput('dashboardKind', 'nurse');
    fixture.detectChanges();
  });

  it('plantilla: ids estables según dashboardKind en el disparador', () => {
    expect(fixture.nativeElement.querySelector('#in-app-notifications-bell-nurse-toggle')).toBeTruthy();
  });

  it('al abrir el panel expone ids en panel y acciones de cabecera', () => {
    (fixture.nativeElement.querySelector('#in-app-notifications-bell-nurse-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#in-app-notifications-bell-nurse-panel')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#in-app-notifications-bell-nurse-mark-all-read-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#in-app-notifications-bell-nurse-refresh-btn')).toBeTruthy();
  });

  it('filas de notificación: ids open, mark-read, acknowledge y remove por id de fila', () => {
    (fixture.nativeElement.querySelector('#in-app-notifications-bell-nurse-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#in-app-notifications-bell-nurse-row-42-open-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#in-app-notifications-bell-nurse-row-42-mark-read-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#in-app-notifications-bell-nurse-row-42-acknowledge-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#in-app-notifications-bell-nurse-row-42-remove-btn')).toBeTruthy();
  });

  it('panel abierto con lista vacía: id empty', () => {
    fixture.componentInstance.items = [];
    fixture.componentInstance.panelOpen = true;
    fixture.componentInstance.loading = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#in-app-notifications-bell-nurse-empty')).toBeTruthy();
  });

  it('panel abierto en carga: id loading', () => {
    fixture.componentInstance.panelOpen = true;
    fixture.componentInstance.loading = true;
    fixture.componentInstance.items = [];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#in-app-notifications-bell-nurse-loading')).toBeTruthy();
  });
});
