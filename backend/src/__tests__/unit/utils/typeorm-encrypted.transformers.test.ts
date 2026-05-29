import {
  encryptedNullableDateTransformer,
  encryptedNullableJsonTransformer,
  encryptedNullableTextTransformer,
  encryptedRequiredTextTransformer,
} from '../../../utils/typeorm-encrypted.transformers';
import { isEncryptedValue } from '../../../utils/field-encryption.util';

describe('typeorm-encrypted.transformers', () => {
  beforeEach(() => {
    process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString('base64');
  });

  it('transforma texto nullable hacia cifrado y desde texto claro', () => {
    const stored = encryptedNullableTextTransformer.to('Observación clínica');

    expect(isEncryptedValue(stored)).toBe(true);
    expect(encryptedNullableTextTransformer.from(stored)).toBe('Observación clínica');
    expect(encryptedNullableTextTransformer.to(null)).toBeNull();
  });

  it('transforma texto requerido conservando string vacío si llega null', () => {
    const stored = encryptedRequiredTextTransformer.to('Paciente Reservado');

    expect(isEncryptedValue(stored)).toBe(true);
    expect(encryptedRequiredTextTransformer.from(stored)).toBe('Paciente Reservado');
  });

  it('transforma JSON nullable', () => {
    const stored = encryptedNullableJsonTransformer.to({ notes: ['a', 'b'] });

    expect(isEncryptedValue(stored)).toBe(true);
    expect(encryptedNullableJsonTransformer.from(stored)).toEqual({ notes: ['a', 'b'] });
  });

  it('transforma fechas nullable', () => {
    const stored = encryptedNullableDateTransformer.to('2000-01-02');

    expect(isEncryptedValue(stored)).toBe(true);
    expect((encryptedNullableDateTransformer.from(stored) as Date).toISOString().slice(0, 10)).toBe('2000-01-02');
  });
});
