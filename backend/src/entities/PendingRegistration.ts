import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserRole } from './User';

@Entity('pending_registrations')
export class PendingRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'nurse', 'supervisor', 'pharmacy'],
    default: UserRole.NURSE,
  })
  role: UserRole;

  @Column({ type: 'varchar', length: 6 })
  verificationCode: string;

  @Column({ type: 'datetime' })
  verificationCodeExpires: Date;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPasswordIfPlain(): Promise<void> {
    if (this.password && !this.password.startsWith('$2a$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }
}
