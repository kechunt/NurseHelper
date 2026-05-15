import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, defaultDashboardPath } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { BootstrapIconComponent } from '../../shared/components/bootstrap-icon/bootstrap-icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BootstrapIconComponent],
  templateUrl: './login.component.html',
  styleUrls: ['../../shared/styles/auth-pages.css', './login.component.css'],
})
export class LoginComponent {
  usernameOrEmail: string = '';
  password: string = '';
  showPassword: boolean = false;
  loading: boolean = false;
  error: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}

  onSubmit(): void {
    if (!this.usernameOrEmail || !this.password) {
      this.error = 'Por favor completa todos los campos';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.usernameOrEmail, this.password).subscribe({
      next: (response) => {
        this.loading = false;
        const user = response.user;
        // Pequeño delay para asegurar que el usuario se haya cargado en el signal
        setTimeout(() => {
          this.router.navigate([defaultDashboardPath(user.role)]);
        }, 100);
      },
      error: (err) => {
        this.loading = false;
        console.error('Login error:', err);
        
        // Si requiere verificación de email
        if (err.status === 403 && err.error?.requiresVerification) {
          this.error = err.error?.message || 'Por favor verifica tu correo electrónico antes de iniciar sesión';
          this.toastService.warning(this.error);
          // Redirigir a página de verificación
          setTimeout(() => {
            const q: Record<string, string> = { email: err.error?.email || '' };
            if (typeof err.error?.smtpConfigured === 'boolean') {
              q['mailOk'] = err.error.smtpConfigured ? '1' : '0';
            }
            void this.router.navigate(['/verify-email'], { queryParams: q });
          }, 2000);
          return;
        }
        
        // Mensajes de error más descriptivos
        if (err.status === 0) {
          // Error de red/CORS
          this.error = 'No se puede conectar al servidor. Verifica que el backend esté funcionando y que CORS esté configurado correctamente.';
        } else if (err.status === 401) {
          this.error = err.error?.message || 'Usuario o contraseña incorrectos';
        } else if (err.status === 404) {
          this.error = 'Endpoint no encontrado. Verifica la URL del backend en environment.prod.ts';
        } else if (err.status >= 500) {
          this.error = 'Error del servidor. Por favor intenta más tarde.';
        } else {
          this.error = err.error?.message || 'Error al iniciar sesión. Revisa la consola para más detalles.';
        }
        
        this.toastService.error(this.error);
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}

