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

export type PatientClinicalNoteCategory =
  | 'diagnosis'
  | 'medical'
  | 'allergies'
  | 'specialNeeds'
  | 'general';

@Entity('patient_clinical_notes')
@Index(['patientId', 'category'])
export class PatientClinicalNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patientId: number;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ type: 'varchar', length: 32 })
  category: PatientClinicalNoteCategory;

  @Column({ type: 'text' })
  body: string;

  @Column()
  authorUserId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'authorUserId' })
  author: User;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;
}
