import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: number;
  role: string;
}

/**
 * Genera un token JWT para un usuario
 */
export function generateToken(userId: number, role: string): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || typeof jwtSecret !== 'string') {
    throw new Error('JWT_SECRET no está configurado en las variables de entorno');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const payload = { userId, role };
  const options = { expiresIn };
  
  return (jwt.sign as any)(payload, jwtSecret, options);
}

/**
 * Verifica y decodifica un token JWT
 */
export function verifyToken(token: string): JwtPayload {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || typeof jwtSecret !== 'string') {
    throw new Error('JWT_SECRET no está configurado en las variables de entorno');
  }

  try {
    return jwt.verify(token, jwtSecret) as JwtPayload;
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
}

