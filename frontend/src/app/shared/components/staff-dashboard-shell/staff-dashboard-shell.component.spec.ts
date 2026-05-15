import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { StaffDashboardShellComponent } from './staff-dashboard-shell.component';

describe('StaffDashboardShellComponent', () => {
  let fixture: ComponentFixture<StaffDashboardShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffDashboardShellComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffDashboardShellComponent);
    fixture.componentRef.setInput('idPrefix', 'test');
    fixture.componentRef.setInput('dashboardTitle', 'T');
    fixture.componentRef.setInput('panelHeadingId', 'h');
    fixture.componentRef.setInput('notificationsKind', 'admin');
    fixture.componentRef.setInput('roleDisplayLabel', 'R');
    fixture.componentRef.setInput('logoAriaLabel', 'logo');
    fixture.componentRef.setInput('navAriaLabel', 'nav');
    fixture.componentRef.setInput('activeTab', 'overview');
    fixture.componentRef.setInput('userDisplayName', 'U');
    fixture.componentRef.setInput('mobileDrawer', false);
    fixture.detectChanges();
  });

  it('cabecera: ids logo, acciones, perfil y logout con prefijo', () => {
    expect(fixture.nativeElement.querySelector('#test-shell-logo-section')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#test-shell-header-actions')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#test-shell-profile-trigger-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#test-shell-logout-btn')).toBeTruthy();
  });

  it('drawer móvil: overlay y cerrar menú usan idPrefix', () => {
    fixture.componentRef.setInput('mobileDrawer', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#test-shell-nav-mobile-overlay')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#test-shell-nav-mobile-close-btn')).toBeTruthy();
  });

  it('nave lateral pestañas: id estable con prefijo shell-nav', () => {
    expect(fixture.nativeElement.querySelector('#test-shell-nav')).toBeTruthy();
  });

  it('regiones layout: ids cabecera y cuerpo con prefijo', () => {
    expect(fixture.nativeElement.querySelector('#test-shell-header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#test-shell-body')).toBeTruthy();
  });

  it('slot principal proyectado: id estable con prefijo shell-main-slot', () => {
    expect(fixture.nativeElement.querySelector('#test-shell-main-slot')).toBeTruthy();
  });

  it('slots after-header, nav-end y quick-modals: ids con prefijo', () => {
    expect(fixture.nativeElement.querySelector('#test-shell-after-header-slot')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#test-shell-nav-end-slot')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#test-shell-quick-modals-slot')).toBeTruthy();
  });

  it('emite tabSelected al pulsar pestaña', () => {
    const c = fixture.componentInstance;
    spyOn(c.tabSelected, 'emit');
    c.selectTab('users');
    expect(c.tabSelected.emit).toHaveBeenCalledWith('users');
  });

  it('onTabKeydown ArrowRight emite la siguiente pestaña', () => {
    const c = fixture.componentInstance;
    spyOn(c.tabSelected, 'emit');
    const ev = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    spyOn(ev, 'preventDefault');
    c.onTabKeydown(ev, 'overview');
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(c.tabSelected.emit).toHaveBeenCalledWith('users');
  });
});
