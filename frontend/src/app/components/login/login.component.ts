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
        console.error('Login error:', err);
        
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
      },
    });
  }
}

