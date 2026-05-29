import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';
import { Medication } from './Medication';
import { MedicationRequest } from './MedicationRequest';
import {
  encryptedNullableTextTransformer,
  encryptedRequiredJsonTransformer,
  encryptedRequiredTextTransformer,
} from '../utils/typeorm-encrypted.transformers';

@Entity('delivery_history')
@Index(['deliveredAt'])
@Index(['medicationId'])
@Index(['requestedById'])
export class DeliveryHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  deliveryId: string;

  @Column()
  requestId: number;

  @ManyToOne(() => MedicationRequest)
  @JoinColumn({ name: 'requestId' })
  request: MedicationRequest;

  @Column()
  medicationId: number;

  @ManyToOne(() => Medication)
  @JoinColumn({ name: 'medicationId' })
  medication: Medication;

  @Column({ type: 'text', transformer: encryptedRequiredTextTransformer })
  dosage: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column()
  requestedById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requestedById' })
  requestedBy: User;

  @Column()
  deliveredById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'deliveredById' })
  deliveredBy: User;

  @Column({ type: 'longtext', transformer: encryptedRequiredJsonTransformer })
  patients: any;

  @Column({ type: 'text', nullable: true, transformer: encryptedNullableTextTransformer })
  notes: string;

  @CreateDateColumn()
  deliveredAt: Date;
}

