/** Evita cargar jsdom/DOMPurify ESM en Jest; replica el post-procesado de `sanitizeString`. */
jest.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: (input: string) =>
      input.replace(/<[^>]*>/g, '').replace(/[\x00-\x1F\x7F]/g, '').trim(),
  },
}));

import {
  sanitizeEmail,
  sanitizeId,
  sanitizeMiddleware,
  sanitizeNumber,
  sanitizeObject,
  sanitizePhone,
  sanitizeString,
} from '../../../utils/sanitizer';

describe('sanitizer', () => {
  describe('sanitizeString', () => {
    it('devuelve cadena vacía para null/undefined', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });

    it('elimina etiquetas HTML y recorta espacios', () => {
      expect(sanitizeString('  <script></script>hola  ')).toBe('hola');
    });
  });

  describe('sanitizeObject', () => {
    it('preserva null y undefined', () => {
      expect(sanitizeObject(null)).toBeNull();
      expect(sanitizeObject(undefined)).toBeUndefined();
    });

    it('sanitiza strings, arrays y objetos anidados', () => {
      const input = {
        a: '<b>x</b>',
        nested: { y: ['  z  '] },
        n: 3,
      };
      const out = sanitizeObject(input);
      expect(out).toEqual({ a: 'x', nested: { y: ['z'] }, n: 3 });
    });
  });

  describe('sanitizeNumber', () => {
    it('parsea número o string numérico y rechaza NaN', () => {
      expect(sanitizeNumber(null)).toBeNull();
      expect(sanitizeNumber(undefined)).toBeNull();
      expect(sanitizeNumber('12.5')).toBe(12.5);
      expect(sanitizeNumber(7)).toBe(7);
      expect(sanitizeNumber('no')).toBeNull();
    });
  });

  describe('sanitizeId', () => {
    it('acepta enteros positivos y rechaza el resto', () => {
      expect(sanitizeId('42')).toBe(42);
      expect(sanitizeId(0)).toBeNull();
      expect(sanitizeId(-1)).toBeNull();
      expect(sanitizeId('1.5')).toBeNull();
    });
  });

  describe('sanitizeEmail', () => {
    it('normaliza email válido a minúsculas y rechaza inválidos', () => {
      expect(sanitizeEmail('  User@Mail.COM  ')).toBe('user@mail.com');
      expect(sanitizeEmail('no-arroba')).toBe('');
      expect(sanitizeEmail(null)).toBe('');
    });
  });

  describe('sanitizePhone', () => {
    it('conserva dígitos, espacios, guiones y paréntesis', () => {
      expect(sanitizePhone('  +34 612-34 (56)  abc  ')).toBe('34 612-34 (56)');
    });
  });

  describe('sanitizeMiddleware', () => {
    it('sanitiza body y query objeto y llama next', () => {
      const next = jest.fn();
      const req: any = {
        body: { msg: '<p>hola</p>' },
        query: { q: '  ok  ' },
      };
      sanitizeMiddleware(req, {}, next);
      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ msg: 'hola' });
      expect(req.query).toEqual({ q: 'ok' });
    });

    it('no falla si body o query no son objeto', () => {
      const next = jest.fn();
      const req: any = { body: 'raw', query: null };
      sanitizeMiddleware(req, {}, next);
      expect(next).toHaveBeenCalled();
      expect(req.body).toBe('raw');
    });
  });
});
