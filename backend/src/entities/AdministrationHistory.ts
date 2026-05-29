import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Patient } from './Patient';
import { User } from './User';
import { Schedule } from './Schedule';
import {
  encryptedNullableTextTransformer,
  encryptedRequiredTextTransformer,
} from '../utils/typeorm-encrypted.transformers';

export enum AdministrationStatus {
  ADMINISTERED = 'administered',
  NOT_ADMINISTERED = 'not_administered',
  MISSED = 'missed',
}

@Entity('administration_history')
@Index(['patientId'])
@Index(['scheduledTime'])
@Index(['administeredById'])
@Index(['patientId', 'scheduledTime'])
@Index(['scheduleId'])
export class AdministrationHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patientId: number;

  @ManyToOne(() => Patient, (patient) => patient.administrationHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ nullable: true })
  scheduleId: number | null;

  @ManyToOne(() => Schedule, (schedule) => schedule.administrationHistory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'scheduleId' })
  schedule: Schedule | null;

  @Column()
  administeredById: number;

  @ManyToOne(() => User, (user) => user.administrationHistory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'administeredById' })
  administeredBy: User;

  @Column({
    type: 'enum',
    enum: AdministrationStatus,
    default: AdministrationStatus.ADMINISTERED,
  })
  status: AdministrationStatus;

  @Column({ type: 'varchar', length: 50 })
  type: string; // 'medication' o 'treatment'

  @Column({ type: 'text', transformer: encryptedRequiredTextTransformer })
  description: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  medication: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  dosage: string | null;

  @Column({ type: 'datetime' })
  scheduledTime: Date;

  @Column({ type: 'datetime', nullable: true })
  administeredAt: Date | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  notes: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  reasonNotAdministered: string | null;

  @CreateDateColumn()
  createdAt: Date;
}









