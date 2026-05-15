import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            register: jasmine
              .createSpy('register')
              .and.returnValue(
                of({
                  message: 'ok',
                  requiresVerification: true,
                  email: 'x@test',
                  smtpConfigured: true,
                })
              ),
          },
        },
        {
          provide: ToastService,
          useValue: {
            success: jasmine.createSpy('success'),
            warning: jasmine.createSpy('warning'),
            error: jasmine.createSpy('error'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('plantilla: ids estables formulario, enviar, términos y enlace a login', () => {
    expect(fixture.nativeElement.querySelector('#register-form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#register-submit-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#register-terms-open-link')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#register-login-link')).toBeTruthy();
  });
});
