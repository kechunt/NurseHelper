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
import { Area } from './Area';
import { Patient } from './Patient';

@Entity('beds')
@Index(['areaId'])
@Index(['bedNumber'])
@Index(['areaId', 'isActive'])
// @Index(['isOccupied']) // Comentado temporalmente hasta que se ejecute la migración
export class Bed {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  bedNumber: string;

  @Column()
  areaId: number;

  @ManyToOne(() => Area, (area) => area.beds, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'areaId' })
  area: Area;

  @OneToMany(() => Patient, (patient) => patient.bed)
  patients: Patient[];

  @Column({ default: false, nullable: true, select: false })
  isOccupied?: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

