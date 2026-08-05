/** Evita cargar jsdom/DOMPurify ESM en Jest; replica el post-procesado de `sanitizeString`. */
jest.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: (input: string) =>
      input.replace(/<[^>]*>/g, '').replace(/[\x00-\x1F\x7F]/g, '').trim(),
  },
}));

import {
  sanitizeMiddleware,
  sanitizeObject,
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
