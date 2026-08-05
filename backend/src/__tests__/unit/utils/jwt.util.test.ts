import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

import { generateToken, verifyToken } from '../../../utils/jwt';

describe('jwt utils', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalExpires = process.env.JWT_EXPIRES_IN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'unit-test-secret';
    delete process.env.JWT_EXPIRES_IN;
    (jwt.sign as jest.Mock).mockReturnValue('signed.jwt.token');
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 7, role: 'nurse' });
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
    if (originalExpires === undefined) {
      delete process.env.JWT_EXPIRES_IN;
    } else {
      process.env.JWT_EXPIRES_IN = originalExpires;
    }
  });

  describe('generateToken', () => {
    it('firma payload con secreto y expiración por defecto', () => {
      const t = generateToken(1, 'admin');
      expect(t).toBe('signed.jwt.token');
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 1, role: 'admin' },
        'unit-test-secret',
        { expiresIn: '15m' }
      );
    });

    it('usa JWT_EXPIRES_IN si está definido', () => {
      process.env.JWT_EXPIRES_IN = '1h';
      generateToken(2, 'nurse');
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 2, role: 'nurse' },
        'unit-test-secret',
        { expiresIn: '1h' }
      );
    });

    it('falla si falta JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      expect(() => generateToken(1, 'x')).toThrow(/JWT_SECRET no está configurado/);
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('devuelve el payload decodificado', () => {
      expect(verifyToken('Bearer-token')).toEqual({ userId: 7, role: 'nurse' });
      expect(jwt.verify).toHaveBeenCalledWith('Bearer-token', 'unit-test-secret');
    });

    it('envuelve fallos de verify en mensaje fijo', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });
      expect(() => verifyToken('bad')).toThrow('Token inválido o expirado');
    });

    it('falla si falta JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      expect(() => verifyToken('x')).toThrow(/JWT_SECRET no está configurado/);
    });
  });
});
