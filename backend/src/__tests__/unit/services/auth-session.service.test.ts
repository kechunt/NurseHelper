import type { Response } from 'express';

const repository = {
  create: jest.fn((value) => value),
  save: jest.fn(async (value) => value),
  findOne: jest.fn(),
};

jest.mock('../../../data-source', () => ({
  AppDataSource: { getRepository: jest.fn(() => repository) },
}));

import { AuthSessionService, readRefreshCookie } from '../../../services/auth-session.service';
import { UserRole } from '../../../entities/User';

describe('AuthSessionService', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('guarda solo el hash y emite cookie segura HttpOnly', async () => {
    const service = new AuthSessionService();
    const cookie = jest.fn();
    await service.issue({ id: 4, role: UserRole.NURSE } as any, true, { cookie } as unknown as Response);

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 4,
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      rememberMe: true,
    }));
    const [, rawToken, options] = cookie.mock.calls[0];
    expect(rawToken).not.toMatch(/^[a-f0-9]{64}$/);
    expect(options).toEqual(expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth',
    }));
  });

  it('rota una sesión activa y revoca el token anterior', async () => {
    const user = { id: 8, role: UserRole.ADMIN, isActive: true } as any;
    const oldSession = {
      userId: 8,
      user,
      revokedAt: null,
      lastUsedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      rememberMe: false,
    };
    repository.findOne.mockResolvedValueOnce(oldSession);
    const cookie = jest.fn();
    const result = await new AuthSessionService().rotate('old-token', { cookie } as unknown as Response);
    expect(result).toBe(user);
    expect(oldSession.revokedAt).toBeInstanceOf(Date);
    expect(repository.save).toHaveBeenCalledWith(oldSession);
    expect(cookie).toHaveBeenCalled();
  });

  it('lee exclusivamente la cookie de refresh esperada', () => {
    expect(readRefreshCookie('x=1; nursehelper_refresh=abc%20123; y=2')).toBe('abc 123');
    expect(readRefreshCookie('x=1')).toBeNull();
  });
});
