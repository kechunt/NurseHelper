import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AuthService, type User } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { DashboardUserProfileModalComponent } from './dashboard-user-profile-modal.component';

describe('DashboardUserProfileModalComponent', () => {
  let fixture: ComponentFixture<DashboardUserProfileModalComponent>;

  const user: User = {
    id: 1,
    username: 'nurse',
    email: 'n@t.c',
    firstName: 'N',
    lastName: 'U',
    role: 'nurse',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardUserProfileModalComponent, HttpClientTestingModule],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: signal(user),
            updateMyProfile: jasmine.createSpy('updateMyProfile').and.returnValue(of({ message: 'ok', user })),
          },
        },
        {
          provide: ToastService,
          useValue: {
            success: jasmine.createSpy('success'),
            error: jasmine.createSpy('error'),
            warning: jasmine.createSpy('warning'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardUserProfileModalComponent);
    fixture.detectChanges();
  });

  it('con modal abierto expone ids en backdrop, cabecera, cancelar y guardar', () => {
    fixture.componentInstance.open();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#dashboard-user-profile-modal-backdrop')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#dashboard-user-profile-modal-header-close-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#dashboard-user-profile-modal-cancel-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#dashboard-user-profile-modal-save-btn')).toBeTruthy();
  });
});
