import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { LessThan } from 'typeorm';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../entities/User';
import { PendingRegistration } from '../entities/PendingRegistration';
import { generateToken } from '../utils/jwt';
import { auditService, AuditService } from '../services/audit.service';
import { emailService } from '../services/email.service';
import { logger } from '../utils/logger';
import { authSessionService, readRefreshCookie } from '../services/auth-session.service';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { usernameOrEmail, password, rememberMe = true } = req.body;

      if (!usernameOrEmail || !password) {
        res.status(400).json({
          message: 'Usuario/email y contraseña son requeridos',
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: [
          { username: usernameOrEmail },
          { email: usernameOrEmail },
        ],
      });

      if (!user) {
        // Registrar intento fallido
        await auditService.logLoginFailed(
          usernameOrEmail,
          'Usuario no encontrado',
          AuditService.getIpAddress(req),
          AuditService.getUserAgent(req)
        );
        res.status(401).json({ message: 'Credenciales inválidas' });
        return;
      }

      if (!user.isActive) {
        // Registrar intento fallido
        await auditService.logLoginFailed(
          usernameOrEmail,
          'Usuario inactivo',
          AuditService.getIpAddress(req),
          AuditService.getUserAgent(req)
        );
        res.status(401).json({ message: 'Usuario inactivo' });
        return;
      }

      // Verificar que el email esté verificado
      if (!user.emailVerified) {
        res.status(403).json({
          message: 'Por favor verifica tu correo electrónico antes de iniciar sesión',
          requiresVerification: true,
          email: user.email,
          smtpConfigured: emailService.isSmtpConfigured(),
        });
        return;
      }

      const isValidPassword = await user.validatePassword(password);

      if (!isValidPassword) {
        // Registrar intento fallido
        await auditService.logLoginFailed(
          usernameOrEmail,
          'Contraseña incorrecta',
          AuditService.getIpAddress(req),
          AuditService.getUserAgent(req)
        );
        res.status(401).json({ message: 'Credenciales inválidas' });
        return;
      }

      const token = generateToken(user.id, user.role);
      await authSessionService.issue(user, Boolean(rememberMe), res);

      // Registrar login exitoso en auditoría
      await auditService.logLoginSuccess(
        user.id,
        AuditService.getIpAddress(req),
        AuditService.getUserAgent(req)
      );

      res.json({
        message: 'Login exitoso',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone ?? null,
        },
      });
    } catch (error) {
      logger.error('Error en login:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const {
        username,
        email,
        password,
        firstName,
        lastName,
        phone: phoneRaw,
      } = req.body;

      /** Registro público: solo rol enfermería; otros roles los crea un admin. */
      const role = UserRole.NURSE;

      if (!username || !email || !password || !firstName || !lastName) {
        res.status(400).json({
          message: 'Todos los campos son requeridos',
        });
        return;
      }

      let phoneNorm: string | null = null;
      if (phoneRaw !== undefined && phoneRaw !== null && String(phoneRaw).trim() !== '') {
        const p = String(phoneRaw).trim();
        if (p.length > 30) {
          res.status(400).json({ message: 'El teléfono no puede superar 30 caracteres' });
          return;
        }
        phoneNorm = p;
      }

      const userRepository = AppDataSource.getRepository(User);
      const pendingRepository = AppDataSource.getRepository(PendingRegistration);

      await pendingRepository.delete({
        verificationCodeExpires: LessThan(new Date()),
      });

      const existingUsername = await userRepository.findOne({
        where: { username },
      });
      if (existingUsername) {
        res.status(400).json({
          message: 'El nombre de usuario ya está en uso',
        });
        return;
      }

      const existingEmail = await userRepository.findOne({
        where: { email },
      });
      if (existingEmail) {
        res.status(400).json({
          message: 'El correo electrónico ya está en uso',
        });
        return;
      }

      const pendingWithUsername = await pendingRepository.findOne({
        where: { username },
      });
      if (pendingWithUsername && pendingWithUsername.email !== email) {
        res.status(400).json({
          message:
            'El nombre de usuario está reservado por otro registro pendiente de verificación. Prueba con otro usuario o espera a que expire (15 min).',
        });
        return;
      }

      const pendingSameEmail = await pendingRepository.findOne({
        where: { email },
      });
      if (pendingSameEmail) {
        await pendingRepository.remove(pendingSameEmail);
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationCodeExpires = new Date();
      verificationCodeExpires.setMinutes(verificationCodeExpires.getMinutes() + 15);

      const pending = new PendingRegistration();
      pending.username = username;
      pending.email = email;
      pending.password = password;
      pending.firstName = firstName;
      pending.lastName = lastName;
      pending.phone = phoneNorm;
      pending.role = role;
      pending.verificationCode = verificationCode;
      pending.verificationCodeExpires = verificationCodeExpires;

      await pendingRepository.save(pending);

      try {
        await emailService.sendVerificationCode(email, verificationCode, firstName);
      } catch (error) {
        logger.error('Error enviando código de verificación:', error);
      }

      res.status(201).json({
        message:
          'Registro pendiente de verificación. Revisa tu correo e introduce el código; tu usuario se creará al confirmar.',
        requiresVerification: true,
        email: pending.email,
        smtpConfigured: emailService.isSmtpConfigured(),
        user: {
          username: pending.username,
          email: pending.email,
          firstName: pending.firstName,
          lastName: pending.lastName,
          role: pending.role,
          emailVerified: false,
          phone: pending.phone,
        },
      });
    } catch (error) {
      logger.error('Error en registro:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        res.status(400).json({
          message: 'Email y código de verificación son requeridos',
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const pendingRepository = AppDataSource.getRepository(PendingRegistration);

      const pending = await pendingRepository.findOne({
        where: { email },
      });

      if (pending) {
        if (pending.verificationCode !== String(code).trim()) {
          res.status(400).json({
            message: 'Código de verificación inválido',
          });
          return;
        }

        if (!pending.verificationCodeExpires || pending.verificationCodeExpires < new Date()) {
          res.status(400).json({
            message: 'El código de verificación ha expirado. Por favor solicita uno nuevo.',
          });
          return;
        }

        const conflict = await userRepository.findOne({
          where: [{ username: pending.username }, { email: pending.email }],
        });
        if (conflict) {
          await pendingRepository.remove(pending);
          res.status(409).json({
            message:
              'Ese correo o usuario ya existe en el sistema. Solicita ayuda al administrador o regístrate con otros datos.',
          });
          return;
        }

        const savedUser = await AppDataSource.transaction(async (manager) => {
          const u = new User();
          u.username = pending.username;
          u.email = pending.email;
          u.password = pending.password;
          u.firstName = pending.firstName;
          u.lastName = pending.lastName;
          u.phone = pending.phone ?? null;
          u.role = pending.role;
          u.emailVerified = true;
          u.verificationCode = null;
          u.verificationCodeExpires = null;
          u.isActive = true;

          const created = await manager.save(u);
          await manager.delete(PendingRegistration, { id: pending.id });
          return created;
        });

        const token = generateToken(savedUser.id, savedUser.role);
        await authSessionService.issue(savedUser, true, res);

        res.json({
          message: 'Correo electrónico verificado exitosamente',
          token,
          user: {
            id: savedUser.id,
            username: savedUser.username,
            email: savedUser.email,
            firstName: savedUser.firstName,
            lastName: savedUser.lastName,
            role: savedUser.role,
            emailVerified: true,
            phone: savedUser.phone ?? null,
          },
        });
        return;
      }

      const user = await userRepository.findOne({
        where: { email },
      });

      if (!user) {
        res.status(404).json({
          message: 'No hay registro pendiente ni usuario con ese correo. Verifica el email o vuelve a registrarte.',
        });
        return;
      }

      if (user.emailVerified) {
        res.status(400).json({
          message: 'El correo electrónico ya está verificado',
        });
        return;
      }

      if (user.verificationCode !== String(code).trim()) {
        res.status(400).json({
          message: 'Código de verificación inválido',
        });
        return;
      }

      if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
        res.status(400).json({
          message: 'El código de verificación ha expirado. Por favor solicita uno nuevo.',
        });
        return;
      }

      user.emailVerified = true;
      user.verificationCode = null;
      user.verificationCodeExpires = null;
      await userRepository.save(user);

      const token = generateToken(user.id, user.role);
      await authSessionService.issue(user, true, res);

      res.json({
        message: 'Correo electrónico verificado exitosamente',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: true,
          phone: user.phone ?? null,
        },
      });
    } catch (error) {
      logger.error('Error en verifyEmail:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async resendVerificationCode(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          message: 'Email es requerido',
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const pendingRepository = AppDataSource.getRepository(PendingRegistration);

      const pending = await pendingRepository.findOne({
        where: { email },
      });

      if (pending) {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationCodeExpires = new Date();
        verificationCodeExpires.setMinutes(verificationCodeExpires.getMinutes() + 15);

        pending.verificationCode = verificationCode;
        pending.verificationCodeExpires = verificationCodeExpires;
        await pendingRepository.save(pending);

        try {
          await emailService.sendVerificationCode(email, verificationCode, pending.firstName);
        } catch (error) {
          logger.error('Error enviando código de verificación:', error);
          res.status(500).json({
            message: 'Error al enviar el código de verificación. Por favor intenta más tarde.',
          });
          return;
        }

        const smtpConfigured = emailService.isSmtpConfigured();
        res.json({
          message: smtpConfigured
            ? 'Código de verificación reenviado exitosamente'
            : 'Código actualizado. El servidor no tiene SMTP configurado: no se envió correo (revisa EMAIL_USER y EMAIL_PASSWORD).',
          email: pending.email,
          smtpConfigured,
        });
        return;
      }

      const user = await userRepository.findOne({
        where: { email },
      });

      if (!user) {
        res.status(404).json({
          message: 'No hay registro pendiente con ese correo',
        });
        return;
      }

      if (user.emailVerified) {
        res.status(400).json({
          message: 'El correo electrónico ya está verificado',
        });
        return;
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationCodeExpires = new Date();
      verificationCodeExpires.setMinutes(verificationCodeExpires.getMinutes() + 15);

      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
      await userRepository.save(user);

      try {
        await emailService.sendVerificationCode(email, verificationCode, user.firstName);
      } catch (error) {
        logger.error('Error enviando código de verificación:', error);
        res.status(500).json({
          message: 'Error al enviar el código de verificación. Por favor intenta más tarde.',
        });
        return;
      }

      const smtpConfigured = emailService.isSmtpConfigured();
      res.json({
        message: smtpConfigured
          ? 'Código de verificación reenviado exitosamente'
          : 'Código actualizado. El servidor no tiene SMTP configurado: no se envió correo (revisa EMAIL_USER y EMAIL_PASSWORD).',
        email: user.email,
        smtpConfigured,
      });
    } catch (error) {
      logger.error('Error en resendVerificationCode:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async updateMe(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const me = authReq.user;

      if (!me?.id) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const { username, email, firstName, lastName, phone: phoneBody } = req.body;

      if (
        username === undefined ||
        email === undefined ||
        firstName === undefined ||
        lastName === undefined
      ) {
        res.status(400).json({
          message: 'Nombre, apellido, usuario y email son requeridos',
        });
        return;
      }

      const usernameTrim = String(username).trim();
      const emailTrim = String(email).trim();
      const firstNameTrim = String(firstName).trim();
      const lastNameTrim = String(lastName).trim();

      if (!firstNameTrim || !lastNameTrim || !usernameTrim || !emailTrim) {
        res.status(400).json({ message: 'Completa todos los campos' });
        return;
      }

      if (usernameTrim.length < 3 || usernameTrim.length > 50) {
        res.status(400).json({
          message: 'El nombre de usuario debe tener entre 3 y 50 caracteres',
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id: me.id } });

      if (!user) {
        res.status(404).json({ message: 'Usuario no encontrado' });
        return;
      }

      if (usernameTrim !== user.username) {
        const existingUsername = await userRepository.findOne({
          where: { username: usernameTrim },
        });
        if (existingUsername) {
          res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
          return;
        }
        user.username = usernameTrim;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrim)) {
        res.status(400).json({ message: 'Email inválido' });
        return;
      }

      if (emailTrim !== user.email) {
        const existingEmail = await userRepository.findOne({
          where: { email: emailTrim },
        });
        if (existingEmail) {
          res.status(400).json({ message: 'El correo electrónico ya está en uso' });
          return;
        }
        user.email = emailTrim;
      }

      user.firstName = firstNameTrim;
      user.lastName = lastNameTrim;

      if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
        if (phoneBody === null || phoneBody === '') {
          user.phone = null;
        } else {
          const p = String(phoneBody).trim();
          if (p.length > 30) {
            res.status(400).json({ message: 'El teléfono no puede superar 30 caracteres' });
            return;
          }
          user.phone = p.length > 0 ? p : null;
        }
      }

      await userRepository.save(user);

      res.json({
        message: 'Información actualizada',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified || false,
          isActive: user.isActive,
          maxPatients: user.maxPatients,
          assignedAreaId: user.assignedAreaId ?? null,
          phone: user.phone ?? null,
        },
      });
    } catch (error) {
      logger.error('Error en updateMe:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;

      if (!user) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified || false,
          phone: user.phone ?? null,
        },
      });
    } catch (error) {
      logger.error('Error en me:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const origin = req.get('origin');
    const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((item) => item.trim());
    if (origin && !allowedOrigins.includes(origin) && origin !== 'http://localhost:4200') {
      res.status(403).json({ message: 'Origen no permitido' });
      return;
    }

    const refreshToken = readRefreshCookie(req.headers.cookie);
    if (!refreshToken) {
      res.status(401).json({ message: 'Sesión no disponible' });
      return;
    }

    const user = await authSessionService.rotate(refreshToken, res);
    if (!user) {
      authSessionService.clearCookie(res);
      res.status(401).json({ message: 'Sesión expirada o revocada' });
      return;
    }

    res.json({
      token: generateToken(user.id, user.role),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone ?? null,
      },
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = readRefreshCookie(req.headers.cookie);
    await authSessionService.revoke(refreshToken);
    authSessionService.clearCookie(res);
    res.json({ message: 'Sesión cerrada' });
  }
}
