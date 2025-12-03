import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  usernameOrEmail: string = '';
  password: string = '';
  loading: boolean = false;
  error: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
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
          if (user.role === 'admin') {
            this.router.navigate(['/admin']);
          } else if (user.role === 'supervisor') {
            this.router.navigate(['/supervisor']);
          } else if (user.role === 'pharmacy') {
            this.router.navigate(['/pharmacy']);
          } else {
            this.router.navigate(['/nurse-dashboard']);
          }
        }, 100);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Error al iniciar sesión';
        console.error('Login error:', err);
      },
    });
  }
}

