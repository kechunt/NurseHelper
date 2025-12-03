import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../entities/User';
import { generateToken } from '../utils/jwt';

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
        res.status(401).json({ message: 'Credenciales inválidas' });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({ message: 'Usuario inactivo' });
        return;
      }

      const isValidPassword = await user.validatePassword(password);

      if (!isValidPassword) {
        res.status(401).json({ message: 'Credenciales inválidas' });
        return;
      }

      const token = generateToken(user.id, user.role);

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

      const user = new User();
      user.username = username;
      user.email = email;
      user.password = password; // Se hasheará automáticamente en el hook BeforeInsert
      user.firstName = firstName;
      user.lastName = lastName;
      user.role = role;

      await userRepository.save(user);

      // Generar token
      const token = generateToken(user.id, user.role);

      res.status(201).json({
        message: 'Usuario registrado exitosamente',
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
      console.error('Error en registro:', error);
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
        },
      });
    } catch (error) {
      console.error('Error en me:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

