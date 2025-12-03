import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, RegisterRequest } from '../../services/auth.service';
import { TermsModalComponent } from '../terms-modal/terms-modal.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TermsModalComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  @ViewChild('termsModal') termsModal!: TermsModalComponent;

  formData: RegisterRequest = {
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'nurse',
  };

  confirmPassword: string = '';
  acceptedTerms: boolean = false;
  loading: boolean = false;
  error: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  openTermsModal(): void {
    this.termsModal.open();
  }

  onTermsAccepted(): void {
    this.acceptedTerms = true;
  }

  onSubmit(): void {
    this.error = '';

    if (!this.validateForm()) {
      return;
    }

    if (!this.acceptedTerms) {
      this.error = 'Debes aceptar los términos y condiciones';
      return;
    }

    if (this.formData.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.loading = true;

    this.authService.register(this.formData).subscribe({
      next: (response) => {
        const user = response.user;
        if (user.role === 'admin') {
          this.router.navigate(['/admin']);
        } else if (user.role === 'pharmacy') {
          this.router.navigate(['/pharmacy']);
        } else {
          this.router.navigate(['/nurse-dashboard']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Error al registrar usuario';
      },
    });
  }

  private validateForm(): boolean {
    if (
      !this.formData.username ||
      !this.formData.email ||
      !this.formData.password ||
      !this.formData.firstName ||
      !this.formData.lastName
    ) {
      this.error = 'Todos los campos son requeridos';
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.email)) {
      this.error = 'Correo electrónico inválido';
      return false;
    }

    if (this.formData.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      return false;
    }

    return true;
  }
}

