import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { DashboardShellComponent } from './dashboard-shell.component';

describe('DashboardShellComponent', () => {
  let fixture: ComponentFixture<DashboardShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardShellComponent, HttpClientTestingModule],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({
              id: 1,
              username: 'nurse',
              email: 'n@t.c',
              firstName: 'N',
              lastName: 'U',
              role: 'nurse' as const,
            }),
          },
        },
        { provide: ToastService, useValue: { error: jasmine.createSpy(), success: jasmine.createSpy() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardShellComponent);
    fixture.componentRef.setInput('panelSkin', 'nurse-dashboard');
    fixture.componentRef.setInput('panelTitle', 'Panel');
    fixture.componentRef.setInput('userName', 'Usuario');
    fixture.componentRef.setInput('roleLabel', 'Enfermería');
    fixture.componentRef.setInput('profileEditable', true);
    fixture.detectChanges();
  });

  it('cabecera: ids en logo, perfil y cierre de sesión', () => {
    expect(fixture.nativeElement.querySelector('#dashboard-shell-logo-section')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#dashboard-shell-profile-trigger-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#dashboard-shell-logout-btn')).toBeTruthy();
  });

  it('móvil: ids overlay, cerrar menú lateral y hamburguesa', () => {
    expect(fixture.nativeElement.querySelector('#dashboard-shell-nav-mobile-overlay')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#dashboard-shell-nav-mobile-close-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#dashboard-shell-nav-hamburger-btn')).toBeTruthy();
  });

  it('navegación lateral: id estable #dashboard-shell-nav', () => {
    expect(fixture.nativeElement.querySelector('#dashboard-shell-nav')).toBeTruthy();
  });

  it('contenido principal: id #dashboard-shell-main-wrapper y slot #dashboard-shell-main-slot', () => {
    expect(fixture.nativeElement.querySelector('#dashboard-shell-main-wrapper')).toBeTruthy();
    const wrap = fixture.nativeElement.querySelector('#dashboard-shell-main-wrapper') as HTMLElement;
    expect(wrap.querySelector('#dashboard-shell-main-slot')).toBeTruthy();
  });

  it('regiones layout: ids cabecera y cuerpo del shell', () => {
    expect(fixture.nativeElement.querySelector('#dashboard-shell-header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#dashboard-shell-body')).toBeTruthy();
  });

  it('proyección overlays: id #dashboard-shell-overlays-slot', () => {
    expect(fixture.nativeElement.querySelector('#dashboard-shell-overlays-slot')).toBeTruthy();
  });
});
