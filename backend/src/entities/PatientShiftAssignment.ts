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
import { Patient } from './Patient';
import { User } from './User';
import { Shift } from './Shift';
import { Area } from './Area';

export type PatientShiftAssignmentStatus = 'assigned' | 'pending' | 'released';
export type PatientShiftAssignmentSource = 'handoff' | 'manual' | 'claim' | 'checkout' | 'sync';

@Entity('patient_shift_assignments')
@Index(['date', 'shiftId', 'patientId'], { unique: true })
@Index(['date', 'shiftId', 'nurseId'])
@Index(['date', 'shiftId', 'status'])
export class PatientShiftAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patientId: number;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ type: 'int', nullable: true })
  nurseId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nurseId' })
  nurse: User | null;

  @Column()
  shiftId: number;

  @ManyToOne(() => Shift, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int', nullable: true })
  areaId: number | null;

  @ManyToOne(() => Area, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'areaId' })
  area: Area | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: PatientShiftAssignmentStatus;

  @Column({ type: 'varchar', length: 20, default: 'handoff' })
  source: PatientShiftAssignmentSource;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
