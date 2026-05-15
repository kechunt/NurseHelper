import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { VerifyEmailComponent } from './verify-email.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import type { User } from '../../services/auth.service';

describe('VerifyEmailComponent', () => {
  let fixture: ComponentFixture<VerifyEmailComponent>;

  const verifiedUser: User = {
    id: 1,
    username: 'u',
    email: 'x@test.local',
    firstName: 'A',
    lastName: 'B',
    role: 'nurse',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyEmailComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ email: 'x@test.local', mailOk: '1' }) },
            queryParams: of({ email: 'x@test.local', mailOk: '1' }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            verifyEmail: jasmine.createSpy('verifyEmail').and.returnValue(
              of({ message: 'ok', token: 't', user: verifiedUser })
            ),
            resendVerificationCode: jasmine
              .createSpy('resendVerificationCode')
              .and.returnValue(of({ message: 'ok', email: 'x@test.local', smtpConfigured: true })),
          },
        },
        {
          provide: ToastService,
          useValue: {
            success: jasmine.createSpy('success'),
            warning: jasmine.createSpy('warning'),
            error: jasmine.createSpy('error'),
            info: jasmine.createSpy('info'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyEmailComponent);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('plantilla: ids estables formulario, verificar, reenviar y enlace a login', () => {
    expect(fixture.nativeElement.querySelector('#verify-email-form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#verify-email-submit-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#verify-email-resend-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#verify-email-login-link')).toBeTruthy();
  });
});
