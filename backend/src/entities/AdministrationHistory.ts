import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Patient } from './Patient';
import { User } from './User';
import { Schedule } from './Schedule';

export enum AdministrationStatus {
  ADMINISTERED = 'administered',
  NOT_ADMINISTERED = 'not_administered',
  MISSED = 'missed',
}

@Entity('administration_history')
export class AdministrationHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patientId: number;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ nullable: true })
  scheduleId: number | null;

  @ManyToOne(() => Schedule, { nullable: true })
  @JoinColumn({ name: 'scheduleId' })
  schedule: Schedule | null;

  @Column()
  administeredById: number;

  @ManyToOne(() => User)
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

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  medication: string | null;

  @Column({ type: 'text', nullable: true })
  dosage: string | null;

  @Column({ type: 'datetime' })
  scheduledTime: Date;

  @Column({ type: 'datetime', nullable: true })
  administeredAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', nullable: true })
  reasonNotAdministered: string | null;

  @CreateDateColumn()
  createdAt: Date;
}



