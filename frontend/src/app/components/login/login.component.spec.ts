import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService, LoginResponse } from '../../services/auth.service';
import { Router, provideRouter } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ToastService } from '../../services/toast.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  const mockUser = {
    id: 1,
    username: 'test',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'nurse' as const,
  };

  const mockLoginResponse: LoginResponse = {
    message: 'Login exitoso',
    token: 'mock-token',
    user: mockUser,
  };

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    const toastSpy = jasmine.createSpyObj('ToastService', ['error', 'warning', 'success', 'info']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, HttpClientTestingModule, FormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('debería crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debería inicializar con campos vacíos', () => {
    expect(component.usernameOrEmail).toBe('');
    expect(component.password).toBe('');
  });

  it('debería llamar a AuthService.login al hacer submit', () => {
    authService.login.and.returnValue(of(mockLoginResponse));

    component.usernameOrEmail = 'testuser';
    component.password = 'password123';
    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
  });

  it('debería navegar al dashboard después de login exitoso', fakeAsync(() => {
    authService.login.and.returnValue(of(mockLoginResponse));

    component.usernameOrEmail = 'testuser';
    component.password = 'password123';
    component.onSubmit();
    tick(150);

    expect(router.navigate).toHaveBeenCalled();
  }));

  it('debería mostrar error cuando login falla', () => {
    authService.login.and.returnValue(
      throwError(() => ({ status: 401, error: { message: 'Credenciales inválidas' } }))
    );

    component.usernameOrEmail = 'testuser';
    component.password = 'wrongpassword';
    component.onSubmit();

    expect(component.error).toBeTruthy();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('debería deshabilitar submit cuando está cargando', () => {
    component.loading = true;
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitButton.disabled).toBeTruthy();
  });
});
