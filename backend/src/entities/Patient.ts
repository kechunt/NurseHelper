import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Bed } from './Bed';
import { Schedule } from './Schedule';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 20, nullable: true })
  identificationNumber: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ length: 10, nullable: true })
  gender: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  medicalHistory: string;

  @Column({ type: 'text', nullable: true })
  allergies: string;

  @Column({ type: 'text', nullable: true })
  emergencyContact: string;

  @Column({ length: 20, nullable: true })
  emergencyPhone: string;

  @Column({ length: 50, nullable: true })
  emergencyRelation: string;

  @Column({ type: 'text', nullable: true })
  medicalObservations: string;

  @Column({ type: 'text', nullable: true })
  specialNeeds: string;

  @Column({ type: 'text', nullable: true })
  generalObservations: string;

  @Column({ type: 'json', nullable: true })
  medications: string;

  @Column({ type: 'json', nullable: true })
  treatmentHistory: string;

  @Column({ type: 'json', nullable: true })
  pendingTasks: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => Bed, (bed) => bed.patient, { nullable: true })
  bed: Bed | null;

  @OneToMany(() => Schedule, (schedule) => schedule.patient)
  schedules: Schedule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

