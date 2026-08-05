import type { Request, Response } from 'express';

jest.mock('../../../data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('../../../utils/jwt', () => ({
  generateToken: jest.fn(() => 'mock.jwt.token'),
}));

jest.mock('../../../services/audit.service', () => ({
  auditService: {
    logLoginFailed: jest.fn().mockResolvedValue(undefined),
    logLoginSuccess: jest.fn().mockResolvedValue(undefined),
  },
  AuditService: {
    getIpAddress: jest.fn(() => '203.0.113.1'),
    getUserAgent: jest.fn(() => 'jest-test-agent'),
  },
}));

jest.mock('../../../services/email.service', () => ({
  emailService: {
    isSmtpConfigured: jest.fn(() => false),
    sendVerificationCode: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../services/auth-session.service', () => ({
  authSessionService: {
    issue: jest.fn().mockResolvedValue(undefined),
    rotate: jest.fn(),
    revoke: jest.fn().mockResolvedValue(undefined),
    clearCookie: jest.fn(),
  },
  readRefreshCookie: jest.fn(),
}));

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

import { User, UserRole } from '../../../entities/User';
import { PendingRegistration } from '../../../entities/PendingRegistration';
import { AppDataSource } from '../../../data-source';
import { generateToken } from '../../../utils/jwt';
import { auditService } from '../../../services/audit.service';
import { emailService } from '../../../services/email.service';
import type { AuthRequest } from '../../../middleware/auth.middleware';
import { AuthController } from '../../../controllers/auth.controller';

describe('AuthController.login', () => {
  let ctrl: AuthController;
  const userRepo = {
    findOne: jest.fn(),
  };

  function baseUser(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 10,
      username: 'nurse1',
      email: 'nurse@example.com',
      firstName: 'Ana',
      lastName: 'López',
      role: UserRole.NURSE,
      isActive: true,
      emailVerified: true,
      phone: '+34111222333',
      validatePassword: jest.fn().mockResolvedValue(true),
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo.findOne.mockResolvedValue(null);
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(userRepo);
    ctrl = new AuthController();
  });

  function resMocks(): { json: jest.Mock; status: jest.Mock; res: Response } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status, res: { status, json } as unknown as Response };
  }

  it('responde 400 si faltan credenciales', async () => {
    const { status, json, res } = resMocks();
    await ctrl.login({ body: { usernameOrEmail: 'x' } } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'Usuario/email y contraseña son requeridos',
    });
    expect(userRepo.findOne).not.toHaveBeenCalled();
  });

  it('401 y auditoría si el usuario no existe', async () => {
    userRepo.findOne.mockResolvedValueOnce(null);
    const { status, json, res } = resMocks();
    await ctrl.login(
      { body: { usernameOrEmail: 'ghost', password: 'secret' } } as Request,
      res
    );
    expect(auditService.logLoginFailed).toHaveBeenCalledWith(
      'ghost',
      'Usuario no encontrado',
      '203.0.113.1',
      'jest-test-agent'
    );
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Credenciales inválidas' });
  });

  it('401 si el usuario está inactivo', async () => {
    userRepo.findOne.mockResolvedValueOnce(baseUser({ isActive: false }));
    const { status, json, res } = resMocks();
    await ctrl.login(
      { body: { usernameOrEmail: 'nurse1', password: 'secret' } } as Request,
      res
    );
    expect(auditService.logLoginFailed).toHaveBeenCalledWith(
      'nurse1',
      'Usuario inactivo',
      expect.any(String),
      expect.any(String)
    );
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Usuario inactivo' });
  });

  it('403 si el email no está verificado', async () => {
    (emailService.isSmtpConfigured as jest.Mock).mockReturnValueOnce(true);
    userRepo.findOne.mockResolvedValueOnce(baseUser({ emailVerified: false }));
    const { status, json, res } = resMocks();
    await ctrl.login(
      { body: { usernameOrEmail: 'nurse@example.com', password: 'secret' } } as Request,
      res
    );
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      message: 'Por favor verifica tu correo electrónico antes de iniciar sesión',
      requiresVerification: true,
      email: 'nurse@example.com',
      smtpConfigured: true,
    });
    expect(generateToken).not.toHaveBeenCalled();
  });

  it('401 si la contraseña no coincide', async () => {
    const u = baseUser();
    (u.validatePassword as jest.Mock).mockResolvedValueOnce(false);
    userRepo.findOne.mockResolvedValueOnce(u);
    const { status, json, res } = resMocks();
    await ctrl.login(
      { body: { usernameOrEmail: 'nurse1', password: 'wrong' } } as Request,
      res
    );
    expect(auditService.logLoginFailed).toHaveBeenCalledWith(
      'nurse1',
      'Contraseña incorrecta',
      expect.any(String),
      expect.any(String)
    );
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Credenciales inválidas' });
  });

  it('200 con token y payload de usuario', async () => {
    const u = baseUser({ phone: null });
    userRepo.findOne.mockResolvedValueOnce(u);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.login(
      { body: { usernameOrEmail: 'nurse1', password: 'good' } } as Request,
      res
    );
    expect(generateToken).toHaveBeenCalledWith(10, UserRole.NURSE);
    expect(auditService.logLoginSuccess).toHaveBeenCalledWith(10, '203.0.113.1', 'jest-test-agent');
    expect(json).toHaveBeenCalledWith({
      message: 'Login exitoso',
      token: 'mock.jwt.token',
      user: {
        id: 10,
        username: 'nurse1',
        email: 'nurse@example.com',
        firstName: 'Ana',
        lastName: 'López',
        role: UserRole.NURSE,
        phone: null,
      },
    });
  });

  it('responde 500 si findOne lanza', async () => {
    userRepo.findOne.mockRejectedValueOnce(new Error('db'));
    const { status, json, res } = resMocks();
    await ctrl.login(
      { body: { usernameOrEmail: 'nurse1', password: 'x' } } as Request,
      res
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });
});

function resMocksShared(): { json: jest.Mock; status: jest.Mock; res: Response } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status, res: { status, json } as unknown as Response };
}

describe('AuthController.register', () => {
  let ctrl: AuthController;
  const userRepoReg = { findOne: jest.fn() };
  const pendingRepoReg = {
    delete: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const validBody = {
    username: 'newuser',
    email: 'new@example.com',
    password: 'Secret1!',
    firstName: 'N',
    lastName: 'U',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (emailService.isSmtpConfigured as jest.Mock).mockReturnValue(false);
    (emailService.sendVerificationCode as jest.Mock).mockResolvedValue(undefined);
    userRepoReg.findOne.mockReset();
    pendingRepoReg.findOne.mockReset();
    pendingRepoReg.save.mockImplementation((p: Record<string, unknown>) =>
      Promise.resolve({ ...p, id: 99 })
    );
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === PendingRegistration) return pendingRepoReg;
      if (entity === User) return userRepoReg;
      return userRepoReg;
    });
    ctrl = new AuthController();
  });

  it('responde 400 si falta algún campo obligatorio', async () => {
    const { status, json, res } = resMocksShared();
    await ctrl.register({ body: { ...validBody, lastName: '' } } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'Todos los campos son requeridos' });
  });

  it('responde 400 si el teléfono supera 30 caracteres', async () => {
    const { status, json, res } = resMocksShared();
    await ctrl.register(
      { body: { ...validBody, phone: 'x'.repeat(31) } } as Request,
      res
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'El teléfono no puede superar 30 caracteres',
    });
  });

  it('ignora el rol del cliente y registra siempre como enfermería', async () => {
    userRepoReg.findOne.mockResolvedValue(null);
    pendingRepoReg.findOne.mockResolvedValue(null);
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    await ctrl.register({ body: { ...validBody, role: 'admin' } } as Request, res);
    expect(status).toHaveBeenCalledWith(201);
    expect(pendingRepoReg.save).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.NURSE })
    );
  });

  it('responde 400 si el nombre de usuario ya existe', async () => {
    userRepoReg.findOne.mockResolvedValueOnce({ id: 1 });
    const { status, json, res } = resMocksShared();
    await ctrl.register({ body: validBody } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'El nombre de usuario ya está en uso' });
  });

  it('responde 400 si el correo ya está en uso', async () => {
    userRepoReg.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 2 });
    const { status, json, res } = resMocksShared();
    await ctrl.register({ body: validBody } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'El correo electrónico ya está en uso' });
  });

  it('responde 400 si el usuario está reservado en pendiente con otro email', async () => {
    userRepoReg.findOne.mockResolvedValue(null);
    pendingRepoReg.findOne.mockResolvedValueOnce({
      username: 'newuser',
      email: 'other@example.com',
    });
    const { status, json, res } = resMocksShared();
    await ctrl.register({ body: validBody } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('registro pendiente'),
      })
    );
  });

  it('201 crea pendiente y envía código', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.12345);
    try {
      userRepoReg.findOne.mockResolvedValue(null);
      pendingRepoReg.findOne.mockResolvedValue(null);
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json } as unknown as Response;
      await ctrl.register({ body: validBody } as Request, res);
      expect(pendingRepoReg.delete).toHaveBeenCalled();
      expect(pendingRepoReg.save).toHaveBeenCalled();
      expect(emailService.sendVerificationCode).toHaveBeenCalledWith(
        'new@example.com',
        expect.any(String),
        'N'
      );
      expect(status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          requiresVerification: true,
          email: 'new@example.com',
          user: expect.objectContaining({ username: 'newuser', emailVerified: false }),
        })
      );
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('responde 500 si save del pendiente falla', async () => {
    userRepoReg.findOne.mockResolvedValue(null);
    pendingRepoReg.findOne.mockResolvedValue(null);
    pendingRepoReg.save.mockRejectedValueOnce(new Error('db'));
    const { status, json, res } = resMocksShared();
    await ctrl.register({ body: validBody } as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });
});

describe('AuthController.verifyEmail', () => {
  let ctrl: AuthController;
  const userRepoV = { findOne: jest.fn(), save: jest.fn() };
  const pendingRepoV = { findOne: jest.fn(), remove: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    jest.clearAllMocks();
    userRepoV.findOne.mockReset();
    userRepoV.save.mockResolvedValue(undefined);
    pendingRepoV.findOne.mockReset();
    (AppDataSource.transaction as jest.Mock).mockReset();
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === PendingRegistration) return pendingRepoV;
      if (entity === User) return userRepoV;
      return userRepoV;
    });
    ctrl = new AuthController();
  });

  it('responde 400 si falta email o código', async () => {
    const { status, json, res } = resMocksShared();
    await ctrl.verifyEmail({ body: { email: 'a@b.com' } } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'Email y código de verificación son requeridos',
    });
  });

  it('404 si no hay pendiente ni usuario con ese correo', async () => {
    pendingRepoV.findOne.mockResolvedValueOnce(null);
    userRepoV.findOne.mockResolvedValueOnce(null);
    const { status, json, res } = resMocksShared();
    await ctrl.verifyEmail({ body: { email: 'x@y.com', code: '123456' } } as Request, res);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      message:
        'No hay registro pendiente ni usuario con ese correo. Verifica el email o vuelve a registrarte.',
    });
  });

  it('400 si el usuario ya tiene email verificado (sin pendiente)', async () => {
    pendingRepoV.findOne.mockResolvedValueOnce(null);
    userRepoV.findOne.mockResolvedValueOnce({
      id: 1,
      email: 'x@y.com',
      emailVerified: true,
      verificationCode: null,
      verificationCodeExpires: null,
    });
    const { status, json, res } = resMocksShared();
    await ctrl.verifyEmail({ body: { email: 'x@y.com', code: '111111' } } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'El correo electrónico ya está verificado',
    });
  });

  it('400 código incorrecto en pendiente', async () => {
    const future = new Date();
    future.setMinutes(future.getMinutes() + 10);
    pendingRepoV.findOne.mockResolvedValueOnce({
      id: 1,
      username: 'u',
      email: 'e@e.com',
      verificationCode: '999999',
      verificationCodeExpires: future,
    });
    const { status, json, res } = resMocksShared();
    await ctrl.verifyEmail({ body: { email: 'e@e.com', code: '000000' } } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'Código de verificación inválido' });
  });

  it('400 código expirado en pendiente', async () => {
    const past = new Date();
    past.setMinutes(past.getMinutes() - 1);
    pendingRepoV.findOne.mockResolvedValueOnce({
      id: 1,
      verificationCode: '111111',
      verificationCodeExpires: past,
    });
    const { status, json, res } = resMocksShared();
    await ctrl.verifyEmail({ body: { email: 'e@e.com', code: '111111' } } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'El código de verificación ha expirado. Por favor solicita uno nuevo.',
    });
  });

  it('409 si al verificar el pendiente ya existe conflicto en users', async () => {
    const future = new Date();
    future.setMinutes(future.getMinutes() + 30);
    const pending = {
      id: 3,
      username: 'dup',
      email: 'dup@mail.com',
      verificationCode: '222222',
      verificationCodeExpires: future,
    };
    pendingRepoV.findOne.mockResolvedValueOnce(pending);
    userRepoV.findOne.mockResolvedValueOnce({ id: 1 });
    const { status, json, res } = resMocksShared();
    await ctrl.verifyEmail({ body: { email: 'dup@mail.com', code: '222222' } } as Request, res);
    expect(pendingRepoV.remove).toHaveBeenCalledWith(pending);
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('ya existe'),
      })
    );
    expect(AppDataSource.transaction).not.toHaveBeenCalled();
  });

  it('200 crea usuario desde pendiente vía transaction y devuelve token', async () => {
    const future = new Date();
    future.setMinutes(future.getMinutes() + 30);
    const pending = {
      id: 7,
      username: 'newu',
      email: 'newu@mail.com',
      password: 'hashed',
      firstName: 'F',
      lastName: 'L',
      phone: null,
      role: UserRole.NURSE,
      verificationCode: '654321',
      verificationCodeExpires: future,
    };
    pendingRepoV.findOne.mockResolvedValueOnce(pending);
    userRepoV.findOne.mockResolvedValueOnce(null);

    const savedUser = {
      id: 42,
      username: pending.username,
      email: pending.email,
      firstName: pending.firstName,
      lastName: pending.lastName,
      role: UserRole.NURSE,
      phone: null,
    };

    (AppDataSource.transaction as jest.Mock).mockImplementation(
      async (cb: (manager: { save: jest.Mock; delete: jest.Mock }) => Promise<typeof savedUser>) => {
        const manager = {
          save: jest.fn().mockResolvedValue(savedUser),
          delete: jest.fn().mockResolvedValue(undefined),
        };
        return cb(manager);
      }
    );

    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.verifyEmail({ body: { email: 'newu@mail.com', code: '654321' } } as Request, res);
    expect(AppDataSource.transaction).toHaveBeenCalled();
    expect(generateToken).toHaveBeenCalledWith(42, UserRole.NURSE);
    expect(json).toHaveBeenCalledWith({
      message: 'Correo electrónico verificado exitosamente',
      token: 'mock.jwt.token',
      user: {
        id: 42,
        username: 'newu',
        email: 'newu@mail.com',
        firstName: 'F',
        lastName: 'L',
        role: UserRole.NURSE,
        emailVerified: true,
        phone: null,
      },
    });
  });

  it('200 verifica usuario existente sin pendiente (marca email y token)', async () => {
    const future = new Date();
    future.setMinutes(future.getMinutes() + 10);
    const user = {
      id: 5,
      username: 'old',
      email: 'old@mail.com',
      firstName: 'O',
      lastName: 'Ld',
      role: UserRole.ADMIN,
      emailVerified: false,
      verificationCode: '888888',
      verificationCodeExpires: future,
      phone: '+34000000000',
    };
    pendingRepoV.findOne.mockResolvedValueOnce(null);
    userRepoV.findOne.mockResolvedValueOnce(user);

    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.verifyEmail({ body: { email: 'old@mail.com', code: '888888' } } as Request, res);

    expect(AppDataSource.transaction).not.toHaveBeenCalled();
    expect(userRepoV.save).toHaveBeenCalledWith(
      expect.objectContaining({
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpires: null,
      })
    );
    expect(generateToken).toHaveBeenCalledWith(5, UserRole.ADMIN);
    expect(json).toHaveBeenCalledWith({
      message: 'Correo electrónico verificado exitosamente',
      token: 'mock.jwt.token',
      user: {
        id: 5,
        username: 'old',
        email: 'old@mail.com',
        firstName: 'O',
        lastName: 'Ld',
        role: UserRole.ADMIN,
        emailVerified: true,
        phone: '+34000000000',
      },
    });
  });

  it('500 si transaction falla al crear usuario desde pendiente', async () => {
    const future = new Date();
    future.setMinutes(future.getMinutes() + 30);
    pendingRepoV.findOne.mockResolvedValueOnce({
      id: 7,
      username: 'newu',
      email: 'newu@mail.com',
      password: 'hashed',
      firstName: 'F',
      lastName: 'L',
      phone: null,
      role: UserRole.NURSE,
      verificationCode: '654321',
      verificationCodeExpires: future,
    });
    userRepoV.findOne.mockResolvedValueOnce(null);
    (AppDataSource.transaction as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const { status, json, res } = resMocksShared();
    await ctrl.verifyEmail({ body: { email: 'newu@mail.com', code: '654321' } } as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });

  it('500 si save falla al verificar usuario existente', async () => {
    const future = new Date();
    future.setMinutes(future.getMinutes() + 10);
    pendingRepoV.findOne.mockResolvedValueOnce(null);
    userRepoV.findOne.mockResolvedValueOnce({
      id: 5,
      username: 'old',
      email: 'old@mail.com',
      firstName: 'O',
      lastName: 'Ld',
      role: UserRole.ADMIN,
      emailVerified: false,
      verificationCode: '888888',
      verificationCodeExpires: future,
      phone: '+34000000000',
    });
    userRepoV.save.mockRejectedValueOnce(new Error('db'));
    const { status, json, res } = resMocksShared();
    await ctrl.verifyEmail({ body: { email: 'old@mail.com', code: '888888' } } as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });
});

describe('AuthController.resendVerificationCode', () => {
  let ctrl: AuthController;
  const userRepoRes = { findOne: jest.fn(), save: jest.fn() };
  const pendingRepoRes = { findOne: jest.fn(), save: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (emailService.sendVerificationCode as jest.Mock).mockResolvedValue(undefined);
    (emailService.isSmtpConfigured as jest.Mock).mockReturnValue(false);
    userRepoRes.findOne.mockReset();
    userRepoRes.save.mockResolvedValue(undefined);
    pendingRepoRes.findOne.mockReset();
    pendingRepoRes.save.mockResolvedValue(undefined);
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === PendingRegistration) return pendingRepoRes;
      if (entity === User) return userRepoRes;
      return userRepoRes;
    });
    ctrl = new AuthController();
  });

  it('responde 400 si falta email', async () => {
    const { status, json, res } = resMocksShared();
    await ctrl.resendVerificationCode({ body: {} } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'Email es requerido' });
  });

  it('404 si no hay pendiente ni usuario con ese email', async () => {
    pendingRepoRes.findOne.mockResolvedValueOnce(null);
    userRepoRes.findOne.mockResolvedValueOnce(null);
    const { status, json, res } = resMocksShared();
    await ctrl.resendVerificationCode({ body: { email: 'missing@x.com' } } as Request, res);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      message: 'No hay registro pendiente con ese correo',
    });
  });

  it('actualiza código en pendiente y responde cuando SMTP no está configurado', async () => {
    const pending = {
      email: 'p@p.com',
      firstName: 'Pat',
      verificationCode: 'old',
      verificationCodeExpires: new Date(),
    };
    pendingRepoRes.findOne.mockResolvedValueOnce(pending);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.resendVerificationCode({ body: { email: 'p@p.com' } } as Request, res);
    expect(pendingRepoRes.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'p@p.com',
        verificationCode: expect.any(String),
      })
    );
    expect(emailService.sendVerificationCode).toHaveBeenCalledWith(
      'p@p.com',
      expect.any(String),
      'Pat'
    );
    expect(json).toHaveBeenCalledWith({
      message:
        'Código actualizado. El servidor no tiene SMTP configurado: no se envió correo (revisa EMAIL_USER y EMAIL_PASSWORD).',
      email: 'p@p.com',
      smtpConfigured: false,
    });
  });

  it('500 si falla el envío del correo con pendiente', async () => {
    pendingRepoRes.findOne.mockResolvedValueOnce({
      email: 'e@e.com',
      firstName: 'E',
      verificationCode: '1',
      verificationCodeExpires: new Date(),
    });
    (emailService.sendVerificationCode as jest.Mock).mockRejectedValueOnce(new Error('smtp down'));
    const { status, json, res } = resMocksShared();
    await ctrl.resendVerificationCode({ body: { email: 'e@e.com' } } as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      message: 'Error al enviar el código de verificación. Por favor intenta más tarde.',
    });
  });

  it('400 si el usuario ya está verificado (rama sin pendiente)', async () => {
    pendingRepoRes.findOne.mockResolvedValueOnce(null);
    userRepoRes.findOne.mockResolvedValueOnce({
      email: 'v@v.com',
      emailVerified: true,
    });
    const { status, json, res } = resMocksShared();
    await ctrl.resendVerificationCode({ body: { email: 'v@v.com' } } as Request, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'El correo electrónico ya está verificado',
    });
  });

  it('actualiza código en usuario no verificado sin pendiente', async () => {
    pendingRepoRes.findOne.mockResolvedValueOnce(null);
    userRepoRes.findOne.mockResolvedValueOnce({
      email: 'u@u.com',
      firstName: 'Uno',
      emailVerified: false,
    });
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.resendVerificationCode({ body: { email: 'u@u.com' } } as Request, res);
    expect(userRepoRes.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'u@u.com',
        verificationCode: expect.any(String),
      })
    );
    expect(emailService.sendVerificationCode).toHaveBeenCalledWith(
      'u@u.com',
      expect.any(String),
      'Uno'
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'u@u.com',
        smtpConfigured: false,
      })
    );
  });

  it('500 si save del pendiente lanza error', async () => {
    pendingRepoRes.findOne.mockResolvedValueOnce({
      email: 'p@p.com',
      firstName: 'Pat',
      verificationCode: 'old',
      verificationCodeExpires: new Date(),
    });
    pendingRepoRes.save.mockRejectedValueOnce(new Error('db'));
    const { status, json, res } = resMocksShared();
    await ctrl.resendVerificationCode({ body: { email: 'p@p.com' } } as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });

  it('500 si save del usuario lanza error (sin pendiente)', async () => {
    pendingRepoRes.findOne.mockResolvedValueOnce(null);
    userRepoRes.findOne.mockResolvedValueOnce({
      email: 'u@u.com',
      firstName: 'Uno',
      emailVerified: false,
    });
    userRepoRes.save.mockRejectedValueOnce(new Error('db'));
    const { status, json, res } = resMocksShared();
    await ctrl.resendVerificationCode({ body: { email: 'u@u.com' } } as Request, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });
});

describe('AuthController.updateMe', () => {
  let ctrl: AuthController;
  const userRepoUp = { findOne: jest.fn(), save: jest.fn() };

  function dbUser(over: Record<string, unknown> = {}) {
    return {
      id: 1,
      username: 'nurse1',
      email: 'nurse@example.com',
      firstName: 'Ana',
      lastName: 'López',
      role: UserRole.NURSE,
      emailVerified: true,
      isActive: true,
      maxPatients: 10,
      assignedAreaId: 2,
      phone: null as string | null,
      ...over,
    };
  }

  function updateBody(over: Record<string, unknown> = {}) {
    return {
      username: 'nurse1',
      email: 'nurse@example.com',
      firstName: 'Ana',
      lastName: 'López',
      ...over,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    userRepoUp.findOne.mockReset();
    userRepoUp.save.mockResolvedValue(undefined);
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === User) return userRepoUp;
      return userRepoUp;
    });
    ctrl = new AuthController();
  });

  it('401 si no hay usuario autenticado', async () => {
    const { status, json, res } = resMocksShared();
    await ctrl.updateMe({ body: updateBody(), user: undefined } as AuthRequest, res);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Usuario no autenticado' });
  });

  it('401 si el usuario no tiene id', async () => {
    const { status, json, res } = resMocksShared();
    await ctrl.updateMe({ body: updateBody(), user: {} as User } as AuthRequest, res);
    expect(status).toHaveBeenCalledWith(401);
  });

  it('400 si falta algún campo obligatorio', async () => {
    const { status, json, res } = resMocksShared();
    const b = updateBody();
    delete (b as { username?: string }).username;
    await ctrl.updateMe({ body: b, user: dbUser() } as unknown as AuthRequest, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'Nombre, apellido, usuario y email son requeridos',
    });
  });

  it('400 si algún campo queda vacío tras trim', async () => {
    const { status, json, res } = resMocksShared();
    await ctrl.updateMe(
      { body: updateBody({ firstName: '   ' }), user: dbUser() } as unknown as AuthRequest,
      res
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'Completa todos los campos' });
  });

  it('400 si el nombre de usuario es demasiado corto', async () => {
    const { status, json, res } = resMocksShared();
    await ctrl.updateMe(
      { body: updateBody({ username: 'ab' }), user: dbUser() } as unknown as AuthRequest,
      res
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'El nombre de usuario debe tener entre 3 y 50 caracteres',
    });
  });

  it('400 si el nombre de usuario supera 50 caracteres', async () => {
    const { status, json, res } = resMocksShared();
    await ctrl.updateMe(
      {
        body: updateBody({ username: 'a'.repeat(51) }),
        user: dbUser(),
      } as unknown as AuthRequest,
      res
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'El nombre de usuario debe tener entre 3 y 50 caracteres',
    });
  });

  it('404 si el usuario ya no existe en BD', async () => {
    userRepoUp.findOne.mockResolvedValueOnce(null);
    const { status, json, res } = resMocksShared();
    await ctrl.updateMe(
      { body: updateBody(), user: { id: 1 } as User } as AuthRequest,
      res
    );
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
  });

  it('400 si el nuevo nombre de usuario ya está en uso', async () => {
    userRepoUp.findOne.mockResolvedValueOnce(dbUser());
    userRepoUp.findOne.mockResolvedValueOnce({ id: 99, username: 'otro' });
    const { status, json, res } = resMocksShared();
    await ctrl.updateMe(
      {
        body: updateBody({ username: 'tomado' }),
        user: { id: 1 } as User,
      } as AuthRequest,
      res
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'El nombre de usuario ya está en uso' });
  });

  it('400 si el email no es válido', async () => {
    userRepoUp.findOne.mockResolvedValueOnce(dbUser());
    const { status, json, res } = resMocksShared();
    await ctrl.updateMe(
      {
        body: updateBody({ email: 'no-es-email' }),
        user: { id: 1 } as User,
      } as AuthRequest,
      res
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'Email inválido' });
  });

  it('400 si el nuevo correo ya está en uso', async () => {
    userRepoUp.findOne.mockResolvedValueOnce(dbUser());
    userRepoUp.findOne.mockResolvedValueOnce({ id: 88, email: 'ya@x.com' });
    const { status, json, res } = resMocksShared();
    await ctrl.updateMe(
      {
        body: updateBody({ email: 'ya@x.com' }),
        user: { id: 1 } as User,
      } as AuthRequest,
      res
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'El correo electrónico ya está en uso' });
  });

  it('400 si el teléfono supera 30 caracteres', async () => {
    userRepoUp.findOne.mockResolvedValueOnce(dbUser());
    const { status, json, res } = resMocksShared();
    await ctrl.updateMe(
      {
        body: updateBody({ phone: '0'.repeat(31) }),
        user: { id: 1 } as User,
      } as AuthRequest,
      res
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'El teléfono no puede superar 30 caracteres',
    });
  });

  it('200 actualiza perfil y devuelve usuario', async () => {
    const row = dbUser();
    userRepoUp.findOne.mockResolvedValueOnce(row);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.updateMe(
      {
        body: updateBody({
          firstName: 'María',
          lastName: 'García',
          phone: '  600111222  ',
        }),
        user: { id: 1 } as User,
      } as AuthRequest,
      res
    );
    expect(userRepoUp.save).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'María',
        lastName: 'García',
        phone: '600111222',
      })
    );
    expect(json).toHaveBeenCalledWith({
      message: 'Información actualizada',
      user: {
        id: 1,
        username: 'nurse1',
        email: 'nurse@example.com',
        firstName: 'María',
        lastName: 'García',
        role: UserRole.NURSE,
        emailVerified: true,
        isActive: true,
        maxPatients: 10,
        assignedAreaId: 2,
        phone: '600111222',
      },
    });
  });

  it('200 permite limpiar teléfono con null', async () => {
    const row = dbUser({ phone: '+34000000000' });
    userRepoUp.findOne.mockResolvedValueOnce(row);
    const json = jest.fn();
    const res = { json } as unknown as Response;
    await ctrl.updateMe(
      {
        body: updateBody({ phone: null }),
        user: { id: 1 } as User,
      } as AuthRequest,
      res
    );
    expect(userRepoUp.save).toHaveBeenCalledWith(expect.objectContaining({ phone: null }));
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ phone: null }),
      })
    );
  });

  it('500 si save falla', async () => {
    userRepoUp.findOne.mockResolvedValueOnce(dbUser());
    userRepoUp.save.mockRejectedValueOnce(new Error('db'));
    const { status, json, res } = resMocksShared();
    await ctrl.updateMe(
      { body: updateBody(), user: { id: 1 } as User } as AuthRequest,
      res
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });
});

describe('AuthController.me', () => {
  let ctrl: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({ findOne: jest.fn() });
    ctrl = new AuthController();
  });

  it('401 sin usuario en la petición', async () => {
    const { status, json, res } = resMocksShared();
    await ctrl.me({ user: undefined } as AuthRequest, res);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Usuario no autenticado' });
  });

  it('200 devuelve datos del usuario autenticado', async () => {
    const json = jest.fn();
    const res = { json } as unknown as Response;
    const user = {
      id: 3,
      username: 'adm',
      email: 'adm@hospital.es',
      firstName: 'Luis',
      lastName: 'Ruiz',
      role: UserRole.ADMIN,
      emailVerified: false,
      phone: '+34111222333',
    } as User;
    await ctrl.me({ user } as AuthRequest, res);
    expect(json).toHaveBeenCalledWith({
      user: {
        id: 3,
        username: 'adm',
        email: 'adm@hospital.es',
        firstName: 'Luis',
        lastName: 'Ruiz',
        role: UserRole.ADMIN,
        emailVerified: false,
        phone: '+34111222333',
      },
    });
  });

  it('500 si res.json lanza', async () => {
    const errJson = jest.fn(() => {
      throw new Error('serialize');
    });
    const innerJson = jest.fn();
    const status = jest.fn().mockReturnValue({ json: innerJson });
    const res = { json: errJson, status } as unknown as Response;
    const user = {
      id: 1,
      username: 'u',
      email: 'u@u.com',
      firstName: 'U',
      lastName: 'U',
      role: UserRole.NURSE,
      emailVerified: true,
      phone: null,
    } as User;
    await ctrl.me({ user } as AuthRequest, res);
    expect(status).toHaveBeenCalledWith(500);
    expect(innerJson).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });
});
