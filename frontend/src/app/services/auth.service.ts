import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id?: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'nurse' | 'supervisor' | 'pharmacy';
  isActive?: boolean;
  emailVerified?: boolean;
  maxPatients?: number;
  assignedAreaId?: number | null;
  /** Si el backend lo expone en el futuro; si no, la UI muestra “No registrado”. */
  phone?: string | null;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Opcional; máx. 30 caracteres en backend. */
  phone?: string | null;
  role?: 'admin' | 'nurse' | 'supervisor' | 'pharmacy';
}

export interface RegisterResponse {
  message: string;
  requiresVerification: boolean;
  email?: string;
  token?: string;
  user?: User;
  /** false si el backend no tiene EMAIL_USER/EMAIL_PASSWORD (no se envía correo real) */
  smtpConfigured?: boolean;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerifyEmailResponse {
  message: string;
  token: string;
  user: User;
}

/** Ruta por defecto del panel según rol (login y guards). */
export function defaultDashboardPath(role: User['role']): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'supervisor':
      return '/supervisor';
    case 'pharmacy':
      return '/pharmacy';
    default:
      return '/nurse-dashboard';
  }
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private tokenKey = 'nursehelper_token';
  private userKey = 'nursehelper_user';

  currentUser = signal<User | null>(null);

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  login(usernameOrEmail: string, password: string): Observable<LoginResponse> {
    const loginUrl = `${this.apiUrl}/login`;

    return this.http
      .post<LoginResponse>(loginUrl, {
        usernameOrEmail,
        password,
      })
      .pipe(
        tap((response) => {
          if (!environment.production) {
            console.log(' Login OK', loginUrl);
          }
          this.setToken(response.token);
          this.setUser(response.user);
        })
      );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, data);
  }

  verifyEmail(data: VerifyEmailRequest): Observable<VerifyEmailResponse> {
    return this.http
      .post<VerifyEmailResponse>(`${this.apiUrl}/verify-email`, data)
      .pipe(
        tap((response) => {
          this.setToken(response.token);
          this.setUser(response.user);
        })
      );
  }

  resendVerificationCode(
    email: string
  ): Observable<{ message: string; email: string; smtpConfigured?: boolean }> {
    return this.http.post<{ message: string; email: string; smtpConfigured?: boolean }>(
      `${this.apiUrl}/resend-verification`,
      { email }
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem(this.userKey);
    if (userStr) {
      try {
        this.currentUser.set(JSON.parse(userStr));
      } catch (e) {
        console.error('Error loading user from storage', e);
      }
    }
  }

  /** Actualizar nombre, apellido, usuario y email del usuario autenticado (cualquier rol). */
  updateMyProfile(body: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    phone?: string | null;
  }): Observable<{ message: string; user: User }> {
    return this.http.patch<{ message: string; user: User }>(`${this.apiUrl}/me`, body).pipe(
      tap((res) => {
        if (res.user) {
          const prev = this.currentUser();
          const merged: User = prev ? { ...prev, ...res.user } : res.user;
          this.setUser(merged);
        }
      })
    );
  }
}

