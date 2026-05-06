import { readNurseDashboardHttpErrorMessage } from './nurse-dashboard-http-error.helpers';

describe('readNurseDashboardHttpErrorMessage', () => {
  const fb = 'Por defecto';

  it('usa fallback con null, no objeto o objeto vacío', () => {
    expect(readNurseDashboardHttpErrorMessage(null, fb)).toBe(fb);
    expect(readNurseDashboardHttpErrorMessage(undefined, fb)).toBe(fb);
    expect(readNurseDashboardHttpErrorMessage('x', fb)).toBe(fb);
    expect(readNurseDashboardHttpErrorMessage({}, fb)).toBe(fb);
  });

  it('prioriza error.error.message', () => {
    expect(readNurseDashboardHttpErrorMessage({ error: { message: ' API ' } }, fb)).toBe(' API ');
  });

  it('acepta error.error como string', () => {
    expect(readNurseDashboardHttpErrorMessage({ error: { error: 'fallo' } }, fb)).toBe('fallo');
  });

  it('acepta error como string en el primer nivel', () => {
    expect(readNurseDashboardHttpErrorMessage({ error: 'texto plano' }, fb)).toBe('texto plano');
  });

  it('usa message de primer nivel si no hay en error.error', () => {
    expect(readNurseDashboardHttpErrorMessage({ message: 'Http failure' }, fb)).toBe('Http failure');
  });

  it('ignora message vacío o solo espacios', () => {
    expect(readNurseDashboardHttpErrorMessage({ error: { message: '   ' } }, fb)).toBe(fb);
  });
});
