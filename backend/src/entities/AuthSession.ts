import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';

@Entity('auth_sessions')
@Index(['tokenHash'], { unique: true })
@Index(['userId', 'revokedAt'])
@Index(['expiresAt'])
export class AuthSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'char', length: 64 })
  tokenHash: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  lastUsedAt: Date | null;

  @Column({ default: false })
  rememberMe: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
