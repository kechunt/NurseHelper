import {
  nurseDashboardHeaderUserDisplayName,
  nurseDashboardHeaderUserPhoneLine,
} from './nurse-dashboard-header-user.helpers';

describe('nurse-dashboard-header-user.helpers', () => {
  describe('nurseDashboardHeaderUserDisplayName', () => {
    it('usa nombre del usuario cuando hay sesión', () => {
      expect(
        nurseDashboardHeaderUserDisplayName({ firstName: 'Ana', lastName: 'Ruiz' }, 'fallback')
      ).toBe('Ana Ruiz');
    });

    it('devuelve cadena vacía si el usuario existe pero sin nombre', () => {
      expect(nurseDashboardHeaderUserDisplayName({ firstName: '', lastName: '' }, 'Invitado')).toBe('');
    });

    it('usa fallback si no hay usuario', () => {
      expect(nurseDashboardHeaderUserDisplayName(null, ' María ')).toBe(' María ');
      expect(nurseDashboardHeaderUserDisplayName(undefined, 'Nombre viejo')).toBe('Nombre viejo');
    });
  });

  describe('nurseDashboardHeaderUserPhoneLine', () => {
    it('devuelve null si teléfono ausente o vacío', () => {
      expect(nurseDashboardHeaderUserPhoneLine(null)).toBeNull();
      expect(nurseDashboardHeaderUserPhoneLine(undefined)).toBeNull();
      expect(nurseDashboardHeaderUserPhoneLine('   ')).toBeNull();
    });

    it('formatea teléfono no vacío', () => {
      expect(nurseDashboardHeaderUserPhoneLine('+34123456789')).toBe('+34123456789');
      expect(nurseDashboardHeaderUserPhoneLine(600111222)).toBe('600111222');
    });
  });
});
