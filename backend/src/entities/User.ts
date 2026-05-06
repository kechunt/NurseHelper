import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Area } from './Area';
import { Patient } from './Patient';
import { Schedule } from './Schedule';
import { AdministrationHistory } from './AdministrationHistory';
import { MedicationRequest } from './MedicationRequest';
import { NurseShift } from './NurseShift';

export enum UserRole {
  ADMIN = 'admin',
  NURSE = 'nurse',
  SUPERVISOR = 'supervisor',
  PHARMACY = 'pharmacy',
}

@Entity('users')
@Index(['role'])
@Index(['isActive'])
@Index(['role', 'isActive'])
@Index(['createdAt'])
@Index(['email'])
@Index(['username'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  /** Teléfono de contacto (opcional). */
  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({
    type: 'enum',
    enum: ['admin', 'nurse', 'supervisor', 'pharmacy'],
    default: UserRole.NURSE,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 6, nullable: true })
  verificationCode: string | null;

  @Column({ type: 'datetime', nullable: true })
  verificationCodeExpires: Date | null;

  @Column({ type: 'int', nullable: true })
  maxPatients: number;

  @Column({ nullable: true })
  assignedAreaId: number | null;

  @ManyToOne(() => Area, { nullable: true })
  @JoinColumn({ name: 'assignedAreaId' })
  assignedArea: Area | null;

  @OneToMany(() => Patient, (patient) => patient.assignedTo)
  assignedPatients: Patient[];

  @OneToMany(() => Schedule, (schedule) => schedule.assignedTo)
  assignedSchedules: Schedule[];

  @OneToMany(() => AdministrationHistory, (history) => history.administeredBy)
  administrationHistory: AdministrationHistory[];

  @OneToMany(() => MedicationRequest, (request) => request.requestedBy)
  medicationRequests: MedicationRequest[];

  @OneToMany(() => NurseShift, (nurseShift) => nurseShift.nurse)
  nurseShifts: NurseShift[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async hashPasswordBeforeInsert() {
    if (this.password && !this.password.startsWith('$2a$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  @BeforeUpdate()
  async hashPasswordBeforeUpdate() {
    // Solo hashear si la contraseña es nueva (no está hasheada ya)
    if (this.password && !this.password.startsWith('$2a$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  async validatePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password);
  }
}

