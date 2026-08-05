/**
 * Controlador de Health Checks
 * Proporciona endpoints detallados para monitoreo
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { asyncHandler } from '../utils/error-handler';
import os from 'os';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      message?: string;
    };
    memory: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      used: number;
      total: number;
      percentage: number;
    };
  };
}

interface MetricsData {
  timestamp: string;
  system: {
    cpu: {
      usage: number;
      cores: number;
    };
    memory: {
      used: number;
      total: number;
      free: number;
      percentage: number;
    };
    uptime: number;
  };
  application: {
    requests: {
      total: number;
      perMinute: number;
      errors: number;
      errorRate: number;
    };
    database: {
      connections: number;
      queries: number;
      slowQueries: number;
    };
  };
}

export class HealthController {
  private requestCount = 0;
  private errorCount = 0;
  private startTime = Date.now();
  private requestsPerMinute: number[] = [];
  private dbQueryCount = 0;
  private slowQueryCount = 0;

  /**
   * Health check básico
   */
  basic = asyncHandler(async (req: Request, res: Response) => {
    try {
      await AppDataSource.query('SELECT 1');
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  /**
   * Health check detallado
   */
  detailed = asyncHandler(async (req: Request, res: Response) => {
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: { status: 'healthy', responseTime: 0 },
        memory: {
          status: 'healthy',
          used: 0,
          total: 0,
          percentage: 0,
        },
        disk: {
          status: 'healthy',
          used: 0,
          total: 0,
          percentage: 0,
        },
      },
    };

    // Check database
    try {
      const dbStart = Date.now();
      await AppDataSource.query('SELECT 1');
      const dbResponseTime = Date.now() - dbStart;
      healthStatus.checks.database.responseTime = dbResponseTime;
      
      if (dbResponseTime > 1000) {
        healthStatus.checks.database.status = 'degraded';
        healthStatus.status = 'degraded';
      }
    } catch (error) {
      healthStatus.checks.database.status = 'unhealthy';
      healthStatus.checks.database.message = (error as Error).message;
      healthStatus.status = 'unhealthy';
    }

    // Check memory
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercentage = (usedMem / totalMem) * 100;

    healthStatus.checks.memory = {
      status: memPercentage > 90 ? 'unhealthy' : memPercentage > 75 ? 'degraded' : 'healthy',
      used: usedMem,
      total: totalMem,
      percentage: Math.round(memPercentage * 100) / 100,
    };

    if (healthStatus.checks.memory.status !== 'healthy') {
      healthStatus.status = healthStatus.checks.memory.status;
    }

    // Check disk (simplificado - en producción usar librería específica)
    try {
      const stats = require('fs').statSync('.');
      // Placeholder - en producción usar 'diskusage' o similar
      healthStatus.checks.disk = {
        status: 'healthy',
        used: 0,
        total: 0,
        percentage: 0,
      };
    } catch (error) {
      healthStatus.checks.disk.status = 'unhealthy';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
  });

  /**
   * Métricas de performance
   */
  metrics = asyncHandler(async (req: Request, res: Response) => {
    const now = Date.now();
    const uptime = now - this.startTime;
    const minutesElapsed = uptime / 60000;

    // Calcular requests por minuto
    const currentMinute = Math.floor(now / 60000);
    this.requestsPerMinute = this.requestsPerMinute.filter(
      (timestamp) => timestamp > currentMinute - 60
    );
    const requestsPerMinute = this.requestsPerMinute.length;

    const metrics: MetricsData = {
      timestamp: new Date().toISOString(),
      system: {
        cpu: {
          usage: this.getCpuUsage(),
          cores: os.cpus().length,
        },
        memory: {
          used: os.totalmem() - os.freemem(),
          total: os.totalmem(),
          free: os.freemem(),
          percentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
        },
        uptime: process.uptime(),
      },
      application: {
        requests: {
          total: this.requestCount,
          perMinute: requestsPerMinute,
          errors: this.errorCount,
          errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
        },
        database: {
          connections: (AppDataSource.options as any).pool?.total || 0,
          queries: this.dbQueryCount,
          slowQueries: this.slowQueryCount,
        },
      },
    };

    res.json(metrics);
  });

  /**
   * Incrementar contador de requests
   */
  incrementRequest(): void {
    this.requestCount++;
    this.requestsPerMinute.push(Math.floor(Date.now() / 60000));
  }

  /**
   * Incrementar contador de errores
   */
  incrementError(): void {
    this.errorCount++;
  }

  /**
   * Incrementar contador de queries
   */
  incrementQuery(isSlow: boolean = false): void {
    this.dbQueryCount++;
    if (isSlow) {
      this.slowQueryCount++;
    }
  }

  /**
   * Obtener uso de CPU (simplificado)
   */
  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - (totalIdle / totalTick) * 100;
  }

  /**
   * Ready check (para Kubernetes)
   */
  ready = asyncHandler(async (req: Request, res: Response) => {
    try {
      await AppDataSource.query('SELECT 1');
      res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: 'Database not ready',
      });
    }
  });

  /**
   * Liveness check (para Kubernetes)
   */
  live = asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
  });
}

export const healthController = new HealthController();
