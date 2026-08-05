import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, firstValueFrom, shareReplay, tap, throwError } from 'rxjs';
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
  /** Solo rol farmacia: prioridad de contacto si varios están de turno. */
  pharmacyRosterOrder?: number | null;
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
  private accessToken: string | null = null;
  private refreshInFlight: Observable<LoginResponse> | null = null;

  currentUser = signal<User | null>(null);

  constructor(private http: HttpClient) {}

  async initialize(): Promise<void> {
    try {
      await firstValueFrom(this.refreshSession());
    } catch {
      this.clearSession();
    }
  }

  login(usernameOrEmail: string, password: string, rememberMe = true): Observable<LoginResponse> {
    const loginUrl = `${this.apiUrl}/login`;

    return this.http
      .post<LoginResponse>(loginUrl, {
        usernameOrEmail,
        password,
        rememberMe,
      }, { withCredentials: true })
      .pipe(
        tap((response) => {
          this.applySession(response);
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
          this.applySession(response);
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
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe({ error: () => undefined });
    this.clearSession();
  }

  getToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private setUser(user: User): void {
    this.currentUser.set(user);
  }

  private applySession(response: LoginResponse): void {
    this.accessToken = response.token;
    this.setUser(response.user);
  }

  clearSession(): void {
    this.accessToken = null;
    this.currentUser.set(null);
  }

  refreshSession(): Observable<LoginResponse> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.http
      .post<LoginResponse>(`${this.apiUrl}/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => this.applySession(response)),
        catchError((error) => {
          this.clearSession();
          return throwError(() => error);
        }),
        finalize(() => (this.refreshInFlight = null)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    return this.refreshInFlight;
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
