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

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  identificationNumber: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'text', nullable: true })
  medicalHistory: string | null;

  @Column({ type: 'text', nullable: true })
  allergies: string | null;

  @Column({ type: 'text', nullable: true })
  emergencyContact: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  emergencyPhone: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  emergencyRelation: string | null;

  @Column({ type: 'text', nullable: true })
  medicalObservations: string | null;

  @Column({ type: 'text', nullable: true })
  specialNeeds: string | null;

  @Column({ type: 'text', nullable: true })
  generalObservations: string | null;

  @Column({ type: 'json', nullable: true })
  medications: string | null;

  @Column({ type: 'json', nullable: true })
  treatmentHistory: string | null;

  @Column({ type: 'json', nullable: true })
  pendingTasks: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', nullable: true, select: false })
  bedId?: number | null;

  @ManyToOne(() => Bed, (bed) => bed.patients, { nullable: true })
  @JoinColumn({ name: 'bedId' })
  bed: Bed | null;

  /** Visible en API para asignación enfermera–paciente (gestión de personal). */
  @Column({ type: 'int', nullable: true })
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

