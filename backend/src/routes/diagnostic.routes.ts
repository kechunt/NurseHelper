import { Router, Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Bed } from '../entities/Bed';
import { Patient } from '../entities/Patient';
import { Area } from '../entities/Area';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Endpoint de diagnóstico para verificar conexión y datos
// Endpoint simple sin autenticación para verificar conexión básica
router.get('/simple', async (req: Request, res: Response) => {
  try {
    const result = {
      timestamp: new Date().toISOString(),
      databaseInitialized: AppDataSource.isInitialized,
      databaseConnected: false,
      error: null as any
    };

    if (AppDataSource.isInitialized) {
      try {
        await AppDataSource.query('SELECT 1');
        result.databaseConnected = true;
      } catch (dbError: any) {
        result.error = {
          message: dbError.message,
          code: dbError.code,
          errno: dbError.errno,
          sqlState: dbError.sqlState
        };
      }
    } else {
      result.error = 'AppDataSource no está inicializado';
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

router.get('/db-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      database: {
        initialized: AppDataSource.isInitialized,
        connected: false,
        error: null
      },
      user: null,
      areas: [],
      beds: [],
      patients: []
    };

    // Verificar inicialización
    if (!AppDataSource.isInitialized) {
      diagnostics.database.error = 'AppDataSource no está inicializado';
      return res.status(500).json(diagnostics);
    }

    // Verificar conexión
    try {
      await AppDataSource.query('SELECT 1');
      diagnostics.database.connected = true;
    } catch (dbError: any) {
      diagnostics.database.error = {
        message: dbError.message,
        code: dbError.code,
        errno: dbError.errno,
        sqlState: dbError.sqlState
      };
      return res.status(500).json(diagnostics);
    }

    // Obtener información del usuario
    if (req.user?.id) {
      try {
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ 
          where: { id: req.user.id },
          relations: [] 
        });
        if (user) {
          diagnostics.user = {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            assignedAreaId: user.assignedAreaId,
            maxPatients: user.maxPatients
          };
        }
      } catch (userError: any) {
        diagnostics.user = { error: userError.message };
      }
    }

    // Obtener áreas
    try {
      const areaRepo = AppDataSource.getRepository(Area);
      const areas = await areaRepo.find({ take: 5 });
      diagnostics.areas = areas.map(a => ({ id: a.id, name: a.name }));
    } catch (areaError: any) {
      diagnostics.areas = { error: areaError.message };
    }

    // Obtener camas
    try {
      const bedRepo = AppDataSource.getRepository(Bed);
      const beds = await bedRepo.find({ 
        where: { isActive: true },
        take: 5,
        order: { bedNumber: 'ASC' }
      });
      diagnostics.beds = beds.map(b => ({ 
        id: b.id, 
        bedNumber: b.bedNumber, 
        areaId: b.areaId,
        isOccupied: (b as any).isOccupied ?? null
      }));
    } catch (bedError: any) {
      diagnostics.beds = { error: bedError.message };
    }

    // Obtener pacientes
    try {
      const patientRepo = AppDataSource.getRepository(Patient);
      const patients = await patientRepo.find({ 
        where: { isActive: true },
        take: 5 
      });
      diagnostics.patients = patients.map(p => ({ 
        id: p.id, 
        firstName: p.firstName, 
        lastName: p.lastName,
        bedId: p.bedId 
      }));
    } catch (patientError: any) {
      diagnostics.patients = { error: patientError.message };
    }

    res.json(diagnostics);
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;
