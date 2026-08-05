import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { RealtimeService } from './realtime.service';
import { AuthService, User } from './auth.service';
import type { UserNotificationDto } from './user-notifications.service';

describe('RealtimeService', () => {
  const userSignal = signal<User | null>(null);
  let getToken: jasmine.Spy;

  beforeEach(() => {
    userSignal.set(null);
    getToken = jasmine.createSpy('getToken').and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        RealtimeService,
        {
          provide: AuthService,
          useValue: {
            currentUser: userSignal,
            getToken,
          },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(RealtimeService).disconnect();
  });

  it('expone streams de eventos sin socket conectado', () => {
    const svc = TestBed.inject(RealtimeService);
    const notifications: UserNotificationDto[] = [];
    const nurseInvalidations: Array<{ scope: string }> = [];
    const adminInvalidations: unknown[] = [];

    svc.onNotificationUpsert().subscribe((n) => notifications.push(n));
    svc.onNurseDashboardInvalidate().subscribe((p) => nurseInvalidations.push(p));
    svc.onAdminOperationalInvalidate().subscribe(() => adminInvalidations.push(true));

    const notification: UserNotificationDto = {
      id: 1,
      type: 'info',
      severity: 'info',
      requiresAck: false,
      title: 't',
      body: 'b',
      payload: null,
      dedupeKey: 'k',
      readAt: null,
      acknowledgedAt: null,
      createdAt: new Date().toISOString(),
    };

    (svc as unknown as { notificationUpsertSubject: Subject<UserNotificationDto> }).notificationUpsertSubject.next(
      notification,
    );
    (svc as unknown as { nurseDashboardInvalidateSubject: Subject<{ scope: string }> }).nurseDashboardInvalidateSubject.next(
      { scope: 'secondary' },
    );
    (svc as unknown as { adminOperationalInvalidateSubject: Subject<void> }).adminOperationalInvalidateSubject.next();

    expect(notifications).toEqual([notification]);
    expect(nurseInvalidations).toEqual([{ scope: 'secondary' }]);
    expect(adminInvalidations.length).toBe(1);
  });

  it('isConnected inicia en false y disconnect no lanza', () => {
    const svc = TestBed.inject(RealtimeService);
    expect(svc.isConnected()).toBeFalse();
    expect(() => svc.disconnect()).not.toThrow();
  });
});
