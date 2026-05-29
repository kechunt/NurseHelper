import { ValueTransformer } from 'typeorm';
import {
  decryptJsonValue,
  decryptNullableDate,
  decryptNullableString,
  encryptJsonValue,
  encryptNullableDate,
  encryptNullableString,
} from './field-encryption.util';

export const encryptedNullableTextTransformer: ValueTransformer = {
  to: (value: string | null | undefined): string | null => encryptNullableString(value),
  from: (value: string | null | undefined): string | null => decryptNullableString(value),
};

export const encryptedRequiredTextTransformer: ValueTransformer = {
  to: (value: string): string => encryptNullableString(value) ?? '',
  from: (value: string): string => decryptNullableString(value) ?? '',
};

export const encryptedNullableJsonTransformer: ValueTransformer = {
  to: (value: unknown): string | null => encryptJsonValue(value),
  from: (value: unknown): unknown => decryptJsonValue(value),
};

export const encryptedRequiredJsonTransformer: ValueTransformer = {
  to: (value: unknown): string => encryptJsonValue(value) ?? encryptJsonValue([])!,
  from: (value: unknown): unknown => decryptJsonValue(value) ?? [],
};

export const encryptedNullableDateTransformer: ValueTransformer = {
  to: (value: Date | string | null | undefined): string | null => encryptNullableDate(value),
  from: (value: string | Date | null | undefined): Date | null => decryptNullableDate(value),
};
