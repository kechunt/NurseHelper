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
import { User } from './User';
import { Medication } from './Medication';
import {
  encryptedNullableTextTransformer,
  encryptedRequiredJsonTransformer,
  encryptedRequiredTextTransformer,
} from '../utils/typeorm-encrypted.transformers';

export enum RequestStatus {
  PENDING = 'pending',
  IN_PREPARATION = 'in_preparation',
  READY = 'ready',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected', // Sinónimo de cancelled para claridad
}

export enum RequestPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('medication_requests')
@Index(['status'])
@Index(['requestedById'])
@Index(['medicationId'])
@Index(['status', 'priority'])
@Index(['createdAt'])
export class MedicationRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  requestId: string;

  @Column()
  requestedById: number;

  @ManyToOne(() => User, (user) => user.medicationRequests, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requestedById' })
  requestedBy: User;

  @Column()
  medicationId: number;

  @ManyToOne(() => Medication, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'medicationId' })
  medication: Medication;

  @Column({ type: 'text', transformer: encryptedRequiredTextTransformer })
  dosage: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'longtext', transformer: encryptedRequiredJsonTransformer })
  patientsInfo: any;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  @Column({
    type: 'enum',
    enum: RequestPriority,
    default: RequestPriority.NORMAL,
  })
  priority: RequestPriority;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

