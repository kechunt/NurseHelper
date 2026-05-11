import { nurseDashboardHeaderUserDisplayName } from './nurse-dashboard-header-user.helpers';

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
});
