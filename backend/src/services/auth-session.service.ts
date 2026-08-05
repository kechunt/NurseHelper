import crypto from 'crypto';
import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { AuthSession } from '../entities/AuthSession';
import { User } from '../entities/User';

const REFRESH_COOKIE = 'nursehelper_refresh';
const SESSION_HOURS = 12;
const REMEMBER_DAYS = 7;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function cookieOptions(rememberMe: boolean) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/auth',
    ...(rememberMe ? { maxAge: REMEMBER_DAYS * 24 * 60 * 60 * 1000 } : {}),
  };
}

export function readRefreshCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  for (const item of cookieHeader.split(';')) {
    const [name, ...value] = item.trim().split('=');
    if (name === REFRESH_COOKIE) return decodeURIComponent(value.join('='));
  }
  return null;
}

export class AuthSessionService {
  async issue(user: User, rememberMe: boolean, res: Response): Promise<void> {
    const token = crypto.randomBytes(48).toString('base64url');
    const expiresAt = new Date(
      Date.now() + (rememberMe ? REMEMBER_DAYS * 24 : SESSION_HOURS) * 60 * 60 * 1000
    );
    const repository = AppDataSource.getRepository(AuthSession);
    await repository.save(
      repository.create({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
        revokedAt: null,
        lastUsedAt: null,
        rememberMe,
      })
    );
    res.cookie(REFRESH_COOKIE, token, cookieOptions(rememberMe));
  }

  async rotate(token: string, res: Response): Promise<User | null> {
    const repository = AppDataSource.getRepository(AuthSession);
    const session = await repository.findOne({
      where: { tokenHash: hashToken(token) },
      relations: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user?.isActive) {
      return null;
    }

    session.revokedAt = new Date();
    session.lastUsedAt = new Date();
    await repository.save(session);
    await this.issue(session.user, session.rememberMe, res);
    return session.user;
  }

  async revoke(token: string | null): Promise<void> {
    if (!token) return;
    const repository = AppDataSource.getRepository(AuthSession);
    const session = await repository.findOne({ where: { tokenHash: hashToken(token) } });
    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      await repository.save(session);
    }
  }

  clearCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, cookieOptions(false));
  }
}

export const authSessionService = new AuthSessionService();
