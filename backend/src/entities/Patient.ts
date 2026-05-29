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
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Bed } from './Bed';
import { Area } from './Area';
import { Schedule } from './Schedule';
import { User } from './User';
import { AdministrationHistory } from './AdministrationHistory';
import {
  encryptedNullableDateTransformer,
  encryptedNullableJsonTransformer,
  encryptedNullableTextTransformer,
  encryptedRequiredTextTransformer,
} from '../utils/typeorm-encrypted.transformers';
import { buildPatientSearchTokenHashes, secureHash } from '../utils/field-encryption.util';

@Entity('patients')
@Index(['isActive'])
@Index(['identificationNumberSearchHash'], { unique: true })
// @Index(['bedId']) // Comentado temporalmente hasta que se ejecute la migración
// @Index(['assignedToId']) // Comentado temporalmente hasta que se ejecute la migración
// @Index(['areaId']) // Comentado temporalmente hasta que se ejecute la migración
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', transformer: encryptedRequiredTextTransformer })
  firstName: string;

  @Column({ type: 'text', transformer: encryptedRequiredTextTransformer })
  lastName: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  identificationNumber: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableDateTransformer })
  dateOfBirth: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  phone: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  address: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  medicalHistory: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  allergies: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  emergencyContact: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  emergencyPhone: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  emergencyRelation: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  medicalObservations: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  specialNeeds: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  generalObservations: string | null;

  @Column({ type: 'longtext', nullable: true, transformer: encryptedNullableJsonTransformer })
  medications: unknown | null;

  @Column({ type: 'longtext', nullable: true, transformer: encryptedNullableJsonTransformer })
  treatmentHistory: unknown | null;

  @Column({ type: 'longtext', nullable: true, transformer: encryptedNullableJsonTransformer })
  pendingTasks: unknown | null;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  firstNameSearchHash: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  lastNameSearchHash: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  identificationNumberSearchHash: string | null;

  @Column({ type: 'longtext', nullable: true, select: false })
  patientSearchTokenHashes: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', nullable: true, select: false })
  bedId?: number | null;

  @ManyToOne(() => Bed, (bed) => bed.patients, { nullable: true })
  @JoinColumn({ name: 'bedId' })
  bed: Bed | null;

  @Column({ type: 'int', nullable: true })
  areaId?: number | null;

  @ManyToOne(() => Area, { nullable: true })
  @JoinColumn({ name: 'areaId' })
  area: Area | null;

  /** Visible en API para asignación enfermera–paciente (gestión de personal). */
  @Column({ type: 'int', nullable: true })
  assignedToId?: number | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  assignmentStatus: 'pending' | 'assigned';

  @Column({ type: 'datetime', nullable: true })
  lastAssignmentAt?: Date | null;

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

  @BeforeInsert()
  @BeforeUpdate()
  refreshSecureSearchColumns(): void {
    this.firstNameSearchHash = secureHash(this.firstName);
    this.lastNameSearchHash = secureHash(this.lastName);
    this.identificationNumberSearchHash = secureHash(this.identificationNumber);
    this.patientSearchTokenHashes = buildPatientSearchTokenHashes({
      firstName: this.firstName,
      lastName: this.lastName,
      identificationNumber: this.identificationNumber,
    });
  }
}

