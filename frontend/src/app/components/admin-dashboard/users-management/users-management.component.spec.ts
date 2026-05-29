import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UsersManagementComponent } from './users-management.component';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import { ExportService } from '../../../shared/services/export.service';

function ensureLocalizeShim(): void {
  const g = globalThis as any;
  if (typeof g.$localize === 'function') {
    return;
  }
  g.$localize = (strings: TemplateStringsArray, ...expr: unknown[]) =>
    strings.reduce((acc, rawPart, idx) => {
      const part = idx === 0 ? rawPart.replace(/^:.*?:/, '') : rawPart;
      return acc + part + (idx < expr.length ? String(expr[idx]) : '');
    }, '');
}

describe('UsersManagementComponent', () => {
  let fixture: ComponentFixture<UsersManagementComponent>;

  const emptyPage = { users: [] as any[], total: 0 };

  const adminServiceMock = {
    getUsersPaginated: jasmine.createSpy('getUsersPaginated').and.returnValue(of(emptyPage)),
  };

  const toastMock = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
    warning: jasmine.createSpy('warning'),
  };

  const confirmationMock = {
    confirm: jasmine.createSpy('confirm').and.returnValue(Promise.resolve(false)),
  };

  const exportMock = {
    exportToCSV: jasmine.createSpy('exportToCSV'),
    exportToPdf: jasmine.createSpy('exportToPdf'),
  };

  beforeEach(async () => {
    ensureLocalizeShim();

    await TestBed.configureTestingModule({
      imports: [UsersManagementComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: ConfirmationService, useValue: confirmationMock },
        { provide: ExportService, useValue: exportMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersManagementComponent);
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('expone cabecera y filtros de rol localizables', () => {
    const c = fixture.componentInstance;
    expect(c.usersMgmtSectionTitle).toContain('Gestión de Usuarios');
    expect(c.usersMgmtRoleFilterOptions.length).toBe(5);
    expect(c.usersMgmtRoleFilterOptions[0].value).toBe('all');
  });

  it('userTableRowAriaLabel incluye el nombre de usuario', () => {
    const c = fixture.componentInstance;
    expect(c.userTableRowAriaLabel('ana')).toContain('ana');
  });

  it('expone toasts, export CSV y errores de carga localizables (flujos TS)', () => {
    const c = fixture.componentInstance;
    expect(c.usersMgmtToastUserUpdated).toContain('actualizado');
    expect(c.usersMgmtExportColEmail).toContain('Email');
    expect(c.usersMgmtErrLoadUsersConnect).toContain('backend');
    expect(c.usersMgmtConfirmNurseRoleTitle).toContain('enfermera');
  });

  it('expone línea de resultados, sufijos de filtro y resumen de hoja localizables', () => {
    const c = fixture.componentInstance;
    c.filteredUsers = [{ id: 1 } as any, { id: 2 } as any];
    c.users = [{ id: 1 } as any];
    c.totalUsers = 10;
    expect(c.getUsersResultsLine()).toContain('2');
    expect(c.getUsersResultsLine()).toContain('10');
    c.selectedRole = 'nurse';
    expect(c.getUsersResultsRolePart()).toContain('Enfermera');
    c.searchQuery = 'ana';
    expect(c.getUsersResultsSearchPart()).toContain('ana');
    const summary = c.userRowActionsSummary({
      id: 1,
      username: 'u1',
      firstName: 'A',
      lastName: 'B',
      email: '',
      role: 'nurse',
      isActive: true,
    } as any);
    expect(summary.length).toBe(4);
    expect(summary[2]).toContain('—');
  });

  it('ngOnInit dispara carga paginada y secciones especiales', () => {
    expect(adminServiceMock.getUsersPaginated).toHaveBeenCalled();
    const calls = adminServiceMock.getUsersPaginated.calls.allArgs();
    const roles = calls.map((a) => a[0]?.role).filter(Boolean);
    expect(roles).toContain('supervisor');
    expect(roles).toContain('pharmacy');
  });

  it('detecta cambio de nombre de usuario y avisa sobre el login', () => {
    const c = fixture.componentInstance;
    c.selectedUser = { id: 1, username: 'ana.vieja', role: 'nurse' } as any;
    c.editForm = { username: 'ana.vieja' };
    expect(c.isEditUsernameChanged()).toBeFalse();

    c.editForm.username = 'ana.nueva';
    expect(c.isEditUsernameChanged()).toBeTrue();
    expect(c.getEditUsernameLoginWarning()).toContain('ana.nueva');
    expect(c.getEditUsernameLoginWarning()).toContain('ana.vieja');
    expect(c.usersMgmtHtmlWarnUsernameLoginHint).toContain('inicio de sesión');
  });
});
