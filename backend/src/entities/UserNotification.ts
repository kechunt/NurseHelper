import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './User';

export type UserNotificationSeverity = 'info' | 'warning' | 'critical';

@Entity('user_notifications')
@Unique('IDX_user_notifications_user_dedupe', ['userId', 'dedupeKey'])
@Index(['userId', 'createdAt'])
export class UserNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** p.ej. area_coverage_critical, schedule_reminder_60 */
  @Column({ type: 'varchar', length: 64 })
  type: string;

  @Column({ type: 'varchar', length: 12 })
  severity: UserNotificationSeverity;

  @Column({ type: 'boolean', default: false })
  requiresAck: boolean;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 220 })
  dedupeKey: string;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  dismissedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
