import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute, ParamMap } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['../../shared/styles/auth-pages.css', './verify-email.component.css'],
})
export class VerifyEmailComponent implements OnInit {
  email: string = '';
  code: string = '';
  loading: boolean = false;
  resending: boolean = false;
  error: string = '';
  /** null = desconocido; false = backend indicó que no hay SMTP */
  smtpLikelyConfigured: boolean | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.applyQueryParams(qp);

    this.route.queryParams.subscribe(() => {
      this.applyQueryParams(this.route.snapshot.queryParamMap);
    });
  }

  private applyQueryParams(qp: ParamMap): void {
    this.email = (qp.get('email') || '').trim();
    const mailOk = qp.get('mailOk');
    if (mailOk === '0') {
      this.smtpLikelyConfigured = false;
    } else if (mailOk === '1') {
      this.smtpLikelyConfigured = true;
    }

    if (!this.email) {
      this.toastService.warning('Indica tu correo desde el registro o el inicio de sesión.');
      void this.router.navigate(['/login']);
    }
  }

  onSubmit(): void {
    this.error = '';

    if (!this.email || !this.code) {
      this.error = 'Por favor completa todos los campos';
      this.toastService.warning('Por favor completa todos los campos');
      return;
    }

    if (this.code.length !== 6) {
      this.error = 'El código debe tener 6 dígitos';
      this.toastService.warning('El código debe tener 6 dígitos');
      return;
    }

    this.loading = true;

    this.authService.verifyEmail({ email: this.email, code: this.code }).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastService.success('Correo electrónico verificado exitosamente');
        
        const user = response.user;
        // Redirigir según el rol
        setTimeout(() => {
          if (user.role === 'admin') {
            this.router.navigate(['/admin']);
          } else if (user.role === 'pharmacy') {
            this.router.navigate(['/pharmacy']);
          } else {
            this.router.navigate(['/nurse-dashboard']);
          }
        }, 1000);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Código inválido o expirado';
        this.toastService.error(this.error);
      },
    });
  }

  resendCode(): void {
    if (!this.email) {
      this.toastService.warning('Email no disponible');
      return;
    }

    this.resending = true;
    this.error = '';

    this.authService.resendVerificationCode(this.email).subscribe({
      next: (res) => {
        this.resending = false;
        if (typeof res.smtpConfigured === 'boolean') {
          this.smtpLikelyConfigured = res.smtpConfigured;
        }
        if (res.smtpConfigured === false) {
          this.toastService.warning(
            'Código renovado en el servidor, pero no hay SMTP configurado: no llegará correo. Revisa EMAIL_USER / EMAIL_PASSWORD en el backend.'
          );
        } else {
          this.toastService.success('Código reenviado. Revisa tu correo (y la carpeta de spam).');
        }
      },
      error: (err) => {
        this.resending = false;
        this.error = err.error?.message || 'Error al reenviar el código';
        this.toastService.error(this.error);
      },
    });
  }

  onCodeInput(event: any): void {
    // Solo permitir números y limitar a 6 dígitos
    const value = event.target.value.replace(/\D/g, '').slice(0, 6);
    this.code = value;
    event.target.value = value;
  }
}
