import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Area } from './Area';
import { Patient } from './Patient';

@Entity('beds')
export class Bed {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  bedNumber: string;

  @Column()
  areaId: number;

  @ManyToOne(() => Area, (area) => area.beds)
  @JoinColumn({ name: 'areaId' })
  area: Area;

  @Column({ nullable: true })
  patientId: number | null;

  @OneToOne(() => Patient, (patient) => patient.bed, { nullable: true })
  @JoinColumn({ name: 'patientId' })
  patient: Patient | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

