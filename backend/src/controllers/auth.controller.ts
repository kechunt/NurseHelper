import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../entities/User';
import { generateToken } from '../utils/jwt';
import { auditService, AuditService } from '../services/audit.service';
import { emailService } from '../services/email.service';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { usernameOrEmail, password } = req.body;

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
          email: user.email
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
        },
      });
    } catch (error) {
      console.error('Error en login:', error);
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
        role = UserRole.NURSE,
      } = req.body;

      if (!username || !email || !password || !firstName || !lastName) {
        res.status(400).json({
          message: 'Todos los campos son requeridos',
        });
        return;
      }

      if (!Object.values(UserRole).includes(role)) {
        res.status(400).json({
          message: 'Rol inválido',
        });
        return;
      }

      const userRepository = AppDataSource.getRepository(User);

      // Verificar si el username ya existe
      const existingUsername = await userRepository.findOne({
        where: { username },
      });

      if (existingUsername) {
        res.status(400).json({
          message: 'El nombre de usuario ya está en uso',
        });
        return;
      }

      // Verificar si el email ya existe
      const existingEmail = await userRepository.findOne({
        where: { email },
      });

      if (existingEmail) {
        res.status(400).json({
          message: 'El correo electrónico ya está en uso',
        });
        return;
      }

      // Generar código de verificación de 6 dígitos
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationCodeExpires = new Date();
      verificationCodeExpires.setMinutes(verificationCodeExpires.getMinutes() + 15); // Expira en 15 minutos

      const user = new User();
      user.username = username;
      user.email = email;
      user.password = password; // Se hasheará automáticamente en el hook BeforeInsert
      user.firstName = firstName;
      user.lastName = lastName;
      user.role = role;
      user.emailVerified = false; // No verificado hasta que confirme el código
      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
      user.isActive = true; // Activo pero sin verificar email

      await userRepository.save(user);

      // Enviar código de verificación por email
      try {
        await emailService.sendVerificationCode(email, verificationCode, firstName);
      } catch (error) {
        console.error('Error enviando código de verificación:', error);
        // No fallar el registro si falla el email, pero loggear el error
        // En producción, podrías querer manejar esto de manera diferente
      }

      res.status(201).json({
        message: 'Usuario registrado exitosamente. Por favor verifica tu correo electrónico.',
        requiresVerification: true,
        email: user.email,
        // NO enviar token hasta que verifique el email
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: false,
        },
      });
    } catch (error) {
      console.error('Error en registro:', error);
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
      const user = await userRepository.findOne({
        where: { email },
      });

      if (!user) {
        res.status(404).json({
          message: 'Usuario no encontrado',
        });
        return;
      }

      if (user.emailVerified) {
        res.status(400).json({
          message: 'El correo electrónico ya está verificado',
        });
        return;
      }

      // Verificar código
      if (user.verificationCode !== code) {
        res.status(400).json({
          message: 'Código de verificación inválido',
        });
        return;
      }

      // Verificar expiración
      if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
        res.status(400).json({
          message: 'El código de verificación ha expirado. Por favor solicita uno nuevo.',
        });
        return;
      }

      // Verificar email
      user.emailVerified = true;
      user.verificationCode = null;
      user.verificationCodeExpires = null;
      await userRepository.save(user);

      // Generar token después de verificar
      const token = generateToken(user.id, user.role);

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
        },
      });
    } catch (error) {
      console.error('Error en verifyEmail:', error);
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
      const user = await userRepository.findOne({
        where: { email },
      });

      if (!user) {
        res.status(404).json({
          message: 'Usuario no encontrado',
        });
        return;
      }

      if (user.emailVerified) {
        res.status(400).json({
          message: 'El correo electrónico ya está verificado',
        });
        return;
      }

      // Generar nuevo código de verificación
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationCodeExpires = new Date();
      verificationCodeExpires.setMinutes(verificationCodeExpires.getMinutes() + 15);

      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
      await userRepository.save(user);

      // Enviar código por email
      try {
        await emailService.sendVerificationCode(email, verificationCode, user.firstName);
      } catch (error) {
        console.error('Error enviando código de verificación:', error);
        res.status(500).json({
          message: 'Error al enviar el código de verificación. Por favor intenta más tarde.',
        });
        return;
      }

      res.json({
        message: 'Código de verificación reenviado exitosamente',
        email: user.email,
      });
    } catch (error) {
      console.error('Error en resendVerificationCode:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const authReq = req as any;
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
        },
      });
    } catch (error) {
      console.error('Error en me:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

