import {
  buildPatientSearchFilter,
  buildPatientSearchTokenHashes,
  decryptJsonValue,
  decryptNullableDate,
  decryptString,
  encryptJsonValue,
  encryptNullableDate,
  encryptString,
  isEncryptedValue,
  secureHash,
} from '../../../utils/field-encryption.util';

describe('field-encryption.util', () => {
  const key = Buffer.alloc(32, 7).toString('base64');

  beforeEach(() => {
    process.env.FIELD_ENCRYPTION_KEY = key;
    delete process.env.FIELD_HASH_KEY;
  });

  it('cifra y descifra strings sin exponer el texto claro', () => {
    const encrypted = encryptString('Diagnóstico reservado');

    expect(isEncryptedValue(encrypted)).toBe(true);
    expect(encrypted).not.toContain('Diagnóstico');
    expect(decryptString(encrypted)).toBe('Diagnóstico reservado');
  });

  it('no cifra dos veces valores con prefijo enc', () => {
    const encrypted = encryptString('Alergia a penicilina');

    expect(encryptString(encrypted)).toBe(encrypted);
  });

  it('descifra correctamente strings vacíos cifrados', () => {
    const encrypted = encryptString('');

    expect(isEncryptedValue(encrypted)).toBe(true);
    expect(decryptString(encrypted)).toBe('');
  });

  it('cifra y descifra JSON', () => {
    const encrypted = encryptJsonValue([{ patientName: 'Ana', doses: ['08:00'] }]);

    expect(isEncryptedValue(encrypted)).toBe(true);
    expect(decryptJsonValue(encrypted)).toEqual([{ patientName: 'Ana', doses: ['08:00'] }]);
  });

  it('cifra fechas como valor date recuperable', () => {
    const encrypted = encryptNullableDate(new Date('1980-02-03T12:00:00Z'));

    expect(isEncryptedValue(encrypted)).toBe(true);
    expect(decryptNullableDate(encrypted)?.toISOString().slice(0, 10)).toBe('1980-02-03');
  });

  it('genera hashes estables para búsqueda normalizada', () => {
    expect(secureHash('María Pérez')).toBe(secureHash('maria   perez'));
  });

  it('genera tokens no reversibles para buscar pacientes por prefijo', () => {
    const tokens = buildPatientSearchTokenHashes({
      firstName: 'María',
      lastName: 'Pérez',
      identificationNumber: 'ABC123',
    });
    const filter = buildPatientSearchFilter('mar', 'patient');

    expect(tokens).toContain(filter?.params.patientSearchToken0.replace(/%/g, ''));
    expect(filter?.clause).toContain('patient.patientSearchTokenHashes');
  });

  it('falla si la clave no tiene 32 bytes', () => {
    process.env.FIELD_ENCRYPTION_KEY = 'short';

    expect(() => encryptString('dato')).toThrow(/32 bytes/);
  });
});
