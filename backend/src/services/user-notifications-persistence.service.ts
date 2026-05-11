import { IsNull, In } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Schedule, ScheduleStatus } from '../entities/Schedule';
import { UserNotification, UserNotificationSeverity } from '../entities/UserNotification';

export type UserNotificationDto = {
  id: number;
  type: string;
  severity: UserNotificationSeverity;
  requiresAck: boolean;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  dedupeKey: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
};

function toDto(n: UserNotification): UserNotificationDto {
  return {
    id: n.id,
    type: n.type,
    severity: n.severity,
    requiresAck: n.requiresAck,
    title: n.title,
    body: n.body,
    payload: n.payload,
    dedupeKey: n.dedupeKey,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    acknowledgedAt: n.acknowledgedAt ? n.acknowledgedAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function listActiveNotificationsForUser(userId: number, limit = 100): Promise<UserNotificationDto[]> {
  const repo = AppDataSource.getRepository(UserNotification);
  const rows = await repo.find({
    where: { userId, dismissedAt: IsNull() },
    order: { createdAt: 'DESC' },
    take: limit,
  });
  return rows.map(toDto);
}

export async function upsertUserNotification(params: {
  userId: number;
  type: string;
  severity: UserNotificationSeverity;
  requiresAck: boolean;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  dedupeKey: string;
}): Promise<UserNotification> {
  const repo = AppDataSource.getRepository(UserNotification);
  const existing = await repo.findOne({
    where: { userId: params.userId, dedupeKey: params.dedupeKey },
  });
  if (existing) {
    existing.type = params.type;
    existing.severity = params.severity;
    existing.requiresAck = params.requiresAck;
    existing.title = params.title;
    existing.body = params.body;
    existing.payload = params.payload;
    existing.dismissedAt = null;
    return repo.save(existing);
  }
  const n = repo.create({
    userId: params.userId,
    type: params.type,
    severity: params.severity,
    requiresAck: params.requiresAck,
    title: params.title,
    body: params.body,
    payload: params.payload,
    dedupeKey: params.dedupeKey,
    readAt: null,
    acknowledgedAt: null,
    dismissedAt: null,
  });
  return repo.save(n);
}

export async function dismissNotificationForUser(userId: number, id: number): Promise<boolean> {
  const repo = AppDataSource.getRepository(UserNotification);
  const res = await repo.update({ id, userId }, { dismissedAt: new Date() });
  return (res.affected ?? 0) > 0;
}

export async function markNotificationRead(userId: number, id: number): Promise<boolean> {
  const repo = AppDataSource.getRepository(UserNotification);
  const res = await repo.update({ id, userId, dismissedAt: IsNull() }, { readAt: new Date() });
  return (res.affected ?? 0) > 0;
}

export async function markNotificationAcknowledged(userId: number, id: number): Promise<boolean> {
  const repo = AppDataSource.getRepository(UserNotification);
  const now = new Date();
  const res = await repo.update(
    { id, userId, dismissedAt: IsNull() },
    { acknowledgedAt: now, readAt: now }
  );
  return (res.affected ?? 0) > 0;
}

export async function markAllNotificationsRead(userId: number): Promise<number> {
  const repo = AppDataSource.getRepository(UserNotification);
  const res = await repo.update({ userId, dismissedAt: IsNull(), readAt: IsNull() }, { readAt: new Date() });
  return res.affected ?? 0;
}

export async function deleteNotificationForUser(userId: number, id: number): Promise<boolean> {
  const repo = AppDataSource.getRepository(UserNotification);
  const res = await repo.delete({ id, userId });
  return (res.affected ?? 0) > 0;
}

export async function dismissByDedupePrefix(userId: number, dedupePrefix: string): Promise<void> {
  const repo = AppDataSource.getRepository(UserNotification);
  await repo
    .createQueryBuilder()
    .update(UserNotification)
    .set({ dismissedAt: new Date() })
    .where('userId = :userId', { userId })
    .andWhere('dedupeKey LIKE :p', { p: `${dedupePrefix}%` })
    .andWhere('dismissedAt IS NULL')
    .execute();
}

export async function dismissUserDedupeKey(userId: number, dedupeKey: string): Promise<void> {
  const repo = AppDataSource.getRepository(UserNotification);
  await repo
    .createQueryBuilder()
    .update(UserNotification)
    .set({ dismissedAt: new Date() })
    .where('userId = :uid', { uid: userId })
    .andWhere('dedupeKey = :k', { k: dedupeKey })
    .andWhere('dismissedAt IS NULL')
    .execute();
}

export async function dismissScheduleNotificationsForNonPendingSchedules(): Promise<void> {
  const repo = AppDataSource.getRepository(UserNotification);
  const rows = await repo
    .createQueryBuilder('n')
    .where('n.dedupeKey LIKE :p', { p: 'sch:%' })
    .andWhere('n.dismissedAt IS NULL')
    .getMany();
  const ids = new Set<number>();
  for (const r of rows) {
    const m = /^sch:(\d+):/.exec(r.dedupeKey);
    if (m) ids.add(Number(m[1]));
  }
  if (ids.size === 0) return;
  const schRepo = AppDataSource.getRepository(Schedule);
  const schedules = await schRepo.find({
    where: { id: In([...ids]) },
    select: ['id', 'status'],
  });
  for (const s of schedules) {
    if (s.status !== ScheduleStatus.PENDING) {
      await dismissScheduleNotificationGroup(s.id);
    }
  }
}

export async function bulkDismissDedupesForUsers(userIds: number[], dedupeKeys: string[]): Promise<void> {
  if (userIds.length === 0 || dedupeKeys.length === 0) return;
  const repo = AppDataSource.getRepository(UserNotification);
  await repo
    .createQueryBuilder()
    .update(UserNotification)
    .set({ dismissedAt: new Date() })
    .where('userId IN (:...uids)', { uids: userIds })
    .andWhere('dedupeKey IN (:...keys)', { keys: dedupeKeys })
    .andWhere('dismissedAt IS NULL')
    .execute();
}

export async function dismissScheduleNotificationGroup(scheduleId: number): Promise<void> {
  const repo = AppDataSource.getRepository(UserNotification);
  const prefix = `sch:${scheduleId}:`;
  await repo
    .createQueryBuilder()
    .update(UserNotification)
    .set({ dismissedAt: new Date() })
    .where('dedupeKey LIKE :p', { p: `${prefix}%` })
    .andWhere('dismissedAt IS NULL')
    .execute();
}

export async function countUnreadForUser(userId: number): Promise<number> {
  const repo = AppDataSource.getRepository(UserNotification);
  return repo.count({
    where: {
      userId,
      dismissedAt: IsNull(),
      readAt: IsNull(),
    },
  });
}

export async function countPendingAckForUser(userId: number): Promise<number> {
  const repo = AppDataSource.getRepository(UserNotification);
  return repo.count({
    where: {
      userId,
      dismissedAt: IsNull(),
      requiresAck: true,
      acknowledgedAt: IsNull(),
    },
  });
}
