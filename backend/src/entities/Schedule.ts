import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Patient } from './Patient';
import { User } from './User';
import { AdministrationHistory } from './AdministrationHistory';
import {
  encryptedNullableTextTransformer,
  encryptedRequiredTextTransformer,
} from '../utils/typeorm-encrypted.transformers';

export enum ScheduleType {
  MEDICATION = 'medication',
  CHECK = 'check',
  TREATMENT = 'treatment',
  OTHER = 'other',
}

export enum ScheduleStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  MISSED = 'missed',
  CANCELLED = 'cancelled',
}

@Entity('schedules')
@Index(['patientId'])
@Index(['scheduledTime'])
@Index(['status'])
@Index(['patientId', 'status'])
@Index(['patientId', 'scheduledTime'])
@Index(['assignedToId'])
@Index(['type', 'status'])
@Index(['scheduledTime', 'status'])
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patientId: number;

  @ManyToOne(() => Patient, (patient) => patient.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ nullable: true })
  assignedToId: number | null;

  @ManyToOne(() => User, (user) => user.assignedSchedules, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User | null;

  @Column({
    type: 'enum',
    enum: ScheduleType,
    default: ScheduleType.OTHER,
  })
  type: ScheduleType;

  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    default: ScheduleStatus.PENDING,
  })
  status: ScheduleStatus;

  @Column({ type: 'datetime' })
  scheduledTime: Date;

  @Column({ type: 'text', transformer: encryptedRequiredTextTransformer })
  description: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  notes: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  medication: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  dosage: string;

  @OneToMany(() => AdministrationHistory, (history) => history.schedule)
  administrationHistory: AdministrationHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

