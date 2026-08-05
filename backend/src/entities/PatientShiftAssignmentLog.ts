import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PatientShiftAssignment } from './PatientShiftAssignment';
import { Patient } from './Patient';
import { Shift } from './Shift';
import { User } from './User';

export type PatientShiftAssignmentLogAction =
  | 'assigned'
  | 'released'
  | 'pending'
  | 'reassigned';

@Entity('patient_shift_assignment_logs')
@Index(['patientId', 'date', 'shiftId'])
@Index(['createdAt'])
export class PatientShiftAssignmentLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  assignmentId: number | null;

  @ManyToOne(() => PatientShiftAssignment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignmentId' })
  assignment: PatientShiftAssignment | null;

  @Column()
  patientId: number;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column()
  shiftId: number;

  @ManyToOne(() => Shift, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int', nullable: true })
  fromNurseId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fromNurseId' })
  fromNurse: User | null;

  @Column({ type: 'int', nullable: true })
  toNurseId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'toNurseId' })
  toNurse: User | null;

  @Column({ type: 'varchar', length: 20 })
  action: PatientShiftAssignmentLogAction;

  @Column({ type: 'varchar', length: 40 })
  source: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
