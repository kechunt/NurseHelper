import crypto from 'crypto';

const ENCRYPTION_PREFIX = 'enc:v1:';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEY_BYTES = 32;

function base64Url(input: Buffer): string {
  return input.toString('base64url');
}

function decodeEncryptionKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error('FIELD_ENCRYPTION_KEY es requerida para cifrar datos sensibles');
  }

  const candidates: Buffer[] = [Buffer.from(raw, 'base64'), Buffer.from(raw, 'utf8')];
  if (/^[a-f0-9]{64}$/i.test(raw)) {
    candidates.push(Buffer.from(raw, 'hex'));
  }

  const key = candidates.find((candidate) => candidate.length === KEY_BYTES);
  if (!key) {
    throw new Error('FIELD_ENCRYPTION_KEY debe decodificar a 32 bytes (base64, hex o texto de 32 caracteres)');
  }
  return key;
}

export function assertFieldEncryptionConfigured(): void {
  decodeEncryptionKey();
}

export function isEncryptedValue(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
}

export function encryptString(value: string): string {
  if (isEncryptedValue(value)) {
    return value;
  }
  const key = decodeEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: AUTH_TAG_BYTES });
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}${base64Url(iv)}:${base64Url(tag)}:${base64Url(ciphertext)}`;
}

export function decryptString(value: string): string {
  if (!isEncryptedValue(value)) {
    return value;
  }

  const parts = value.split(':');
  const [, version, ivPart, tagPart, ciphertextPart] = parts;
  if (parts.length !== 5 || version !== 'v1' || !ivPart || !tagPart || ciphertextPart === undefined) {
    throw new Error('Formato de cifrado inválido');
  }

  const key = decodeEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64url'), {
    authTagLength: AUTH_TAG_BYTES,
  });
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function encryptNullableString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return encryptString(String(value));
}

export function decryptNullableString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return decryptString(String(value));
}

export function encryptJsonValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (isEncryptedValue(value)) {
    return value;
  }
  return encryptString(JSON.stringify(value));
}

export function decryptJsonValue<T = unknown>(value: unknown): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    return value as T;
  }
  const plain = decryptString(value);
  try {
    return JSON.parse(plain) as T;
  } catch {
    return plain as T;
  }
}

export function formatDateForEncryption(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export function encryptNullableDate(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (isEncryptedValue(value)) {
    return value;
  }
  return encryptString(formatDateForEncryption(value));
}

export function decryptNullableDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const plain = decryptString(String(value));
  const date = new Date(`${plain.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeSecureSearchValue(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashKey(): Buffer {
  return process.env.FIELD_HASH_KEY ? Buffer.from(process.env.FIELD_HASH_KEY, 'utf8') : decodeEncryptionKey();
}

export function secureHash(value: unknown): string | null {
  const normalized = normalizeSecureSearchValue(isEncryptedValue(value) ? decryptString(value) : value);
  if (!normalized) {
    return null;
  }
  return crypto.createHmac('sha256', hashKey()).update(normalized).digest('hex');
}

function tokenPrefixes(token: string): string[] {
  if (token.length <= 2) {
    return [token];
  }
  const prefixes: string[] = [];
  for (let length = 2; length <= token.length; length += 1) {
    prefixes.push(token.slice(0, length));
  }
  return prefixes;
}

export function buildPatientSearchTokenHashes(params: {
  firstName?: unknown;
  lastName?: unknown;
  identificationNumber?: unknown;
}): string | null {
  const firstName = normalizeSecureSearchValue(isEncryptedValue(params.firstName) ? decryptString(params.firstName) : params.firstName);
  const lastName = normalizeSecureSearchValue(isEncryptedValue(params.lastName) ? decryptString(params.lastName) : params.lastName);
  const identification = normalizeSecureSearchValue(
    isEncryptedValue(params.identificationNumber) ? decryptString(params.identificationNumber) : params.identificationNumber
  );

  const rawTokens = new Set<string>();
  for (const value of [firstName, lastName, `${firstName} ${lastName}`.trim(), identification]) {
    if (!value) {
      continue;
    }
    rawTokens.add(value);
    value.split(/\s+/).forEach((token) => {
      tokenPrefixes(token).forEach((prefix) => rawTokens.add(prefix));
    });
  }

  const hashes = Array.from(rawTokens)
    .map((token) => secureHash(token))
    .filter((hash): hash is string => !!hash);

  return hashes.length ? `|${Array.from(new Set(hashes)).join('|')}|` : null;
}

export function buildPatientSearchFilter(search: string | undefined, alias = 'patient'): { clause: string; params: Record<string, string> } | null {
  const normalized = normalizeSecureSearchValue(search);
  if (!normalized) {
    return null;
  }

  const parts = Array.from(new Set([normalized, ...normalized.split(/\s+/).filter(Boolean)]));
  const params: Record<string, string> = {};
  const tokenClauses = parts
    .map((part, idx) => {
      const hash = secureHash(part);
      if (!hash) {
        return null;
      }
      params[`patientSearchToken${idx}`] = `%|${hash}|%`;
      return `${alias}.patientSearchTokenHashes LIKE :patientSearchToken${idx}`;
    })
    .filter((clause): clause is string => !!clause);

  const exactHash = secureHash(normalized);
  if (exactHash) {
    params.patientSearchExactHash = exactHash;
    tokenClauses.push(`${alias}.firstNameSearchHash = :patientSearchExactHash`);
    tokenClauses.push(`${alias}.lastNameSearchHash = :patientSearchExactHash`);
    tokenClauses.push(`${alias}.identificationNumberSearchHash = :patientSearchExactHash`);
  }

  return tokenClauses.length ? { clause: `(${tokenClauses.join(' OR ')})`, params } : null;
}
