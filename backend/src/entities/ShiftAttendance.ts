import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';
import { Shift } from './Shift';

export enum ShiftAttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  JUSTIFIED = 'justified',
  MISSING = 'missing',
}

@Entity('shift_attendance')
@Index(['date', 'shiftId', 'nurseId'], { unique: true })
@Index(['date', 'shiftId'])
@Index(['nurseId', 'date'])
export class ShiftAttendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column()
  shiftId: number;

  @ManyToOne(() => Shift, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @Column()
  nurseId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nurseId' })
  nurse: User;

  @Column({
    type: 'enum',
    enum: ShiftAttendanceStatus,
    default: ShiftAttendanceStatus.ABSENT,
  })
  status: ShiftAttendanceStatus;

  @Column({ type: 'datetime', nullable: true })
  checkInAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  checkOutAt: Date | null;

  @Column({ type: 'int', nullable: true })
  recordedBy: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recordedBy' })
  recordedByUser: User | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
