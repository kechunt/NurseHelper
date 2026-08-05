import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import type { UserNotificationDto } from './user-notifications-persistence.service';

export type NurseDashboardInvalidateScope = 'all' | 'primary' | 'secondary';

const REALTIME_PATH = '/api/socket.io';

let io: Server | null = null;

function resolveAllowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : [];
  return ['http://localhost:4200', ...fromEnv];
}

function extractSocketToken(socket: Socket): string | null {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.length > 0) {
    return authToken;
  }
  const header = socket.handshake.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length);
  }
  return null;
}

/** Inicializa Socket.IO sobre el servidor HTTP existente. */
export function initRealtimeServer(httpServer: HttpServer): Server {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    path: REALTIME_PATH,
    cors: {
      origin: resolveAllowedOrigins(),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = extractSocketToken(socket);
    if (!token) {
      next(new Error('Token no proporcionado'));
      return;
    }
    try {
      const decoded = verifyToken(token);
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      next();
    } catch {
      next(new Error('Token inválido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as number;
    const role = socket.data.role as string;
    void socket.join(`user:${userId}`);
    void socket.join(`role:${role}`);
    logger.info(`🔌 WS conectado user=${userId} role=${role}`);

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 WS desconectado user=${userId} (${reason})`);
    });
  });

  logger.info(`✅ Socket.IO activo en path ${REALTIME_PATH}`);
  return io;
}

export function emitToUser(userId: number, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToRole(role: string, event: string, payload: unknown): void {
  io?.to(`role:${role}`).emit(event, payload);
}

export function emitNotificationUpsert(userId: number, notification: UserNotificationDto): void {
  emitToUser(userId, 'notification:upsert', { notification });
}

export function emitNurseDashboardInvalidate(
  nurseId: number,
  scope: NurseDashboardInvalidateScope = 'all',
): void {
  emitToUser(nurseId, 'nurse:dashboard:invalidate', { scope });
}

export function emitAdminOperationalInvalidate(): void {
  emitToRole('admin', 'admin:operational:invalidate', {});
  emitToRole('supervisor', 'admin:operational:invalidate', {});
}
