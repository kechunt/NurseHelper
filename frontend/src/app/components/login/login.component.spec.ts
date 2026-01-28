import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, HttpClientTestingModule, FormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('debería crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debería inicializar con campos vacíos', () => {
    expect(component.username).toBe('');
    expect(component.password).toBe('');
  });

  it('debería llamar a AuthService.login al hacer submit', () => {
    const mockResponse = {
      message: 'Login exitoso',
      token: 'mock-token',
      user: { id: 1, username: 'test', role: 'nurse' },
    };

    authService.login.and.returnValue(of(mockResponse));

    component.username = 'testuser';
    component.password = 'password123';
    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
  });

  it('debería navegar al dashboard después de login exitoso', () => {
    const mockResponse = {
      message: 'Login exitoso',
      token: 'mock-token',
      user: { id: 1, username: 'test', role: 'nurse' },
    };

    authService.login.and.returnValue(of(mockResponse));

    component.username = 'testuser';
    component.password = 'password123';
    component.onSubmit();

    expect(router.navigate).toHaveBeenCalled();
  });

  it('debería mostrar error cuando login falla', () => {
    authService.login.and.returnValue(
      throwError(() => ({ error: { message: 'Credenciales inválidas' } }))
    );

    component.username = 'testuser';
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
