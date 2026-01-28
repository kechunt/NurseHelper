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
import { Bed } from './Bed';
import { Schedule } from './Schedule';
import { User } from './User';
import { AdministrationHistory } from './AdministrationHistory';

@Entity('patients')
@Index(['isActive'])
@Index(['lastName'])
@Index(['firstName', 'lastName'])
// @Index(['bedId']) // Comentado temporalmente hasta que se ejecute la migración
// @Index(['assignedToId']) // Comentado temporalmente hasta que se ejecute la migración
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 20, nullable: true, unique: true })
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

  @Column({ nullable: true, select: false })
  bedId?: number | null;

  @ManyToOne(() => Bed, (bed) => bed.patients, { nullable: true })
  @JoinColumn({ name: 'bedId' })
  bed: Bed | null;

  @Column({ nullable: true, select: false })
  assignedToId?: number | null;

  @ManyToOne(() => User, (user) => user.assignedPatients, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User | null;

  @OneToMany(() => Schedule, (schedule) => schedule.patient, { cascade: false })
  schedules: Schedule[];

  @OneToMany(() => AdministrationHistory, (history) => history.patient, { cascade: false })
  administrationHistory: AdministrationHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

