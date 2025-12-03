import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Shift } from './Shift';

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

@Entity('nurse_shifts')
export class NurseShift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nurseId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'nurseId' })
  nurse: User;

  @Column()
  shiftId: number;

  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @Column({ type: 'int' })
  dayOfWeek: number;

  @Column({ type: 'date' })
  weekStartDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

