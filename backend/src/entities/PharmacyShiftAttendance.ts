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
import { ShiftAttendanceStatus } from './ShiftAttendance';
import { encryptedNullableTextTransformer } from '../utils/typeorm-encrypted.transformers';

@Entity('pharmacy_shift_attendance')
@Index(['date', 'shiftId', 'pharmacyUserId'], { unique: true })
@Index(['date', 'shiftId'])
export class PharmacyShiftAttendance {
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
  pharmacyUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pharmacyUserId' })
  pharmacyUser: User;

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

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
